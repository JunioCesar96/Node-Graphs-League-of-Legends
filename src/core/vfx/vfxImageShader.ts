/** Shader imagem VFX (sprite + color ramp + mult + palette + fresnel). */

export const VFX_IMAGE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

export const VFX_IMAGE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uColorMap;
  uniform sampler2D uMultMap;
  uniform sampler2D uPaletteMap;
  uniform bool uHasColor;
  uniform bool uHasMult;
  uniform bool uHasPalette;
  uniform vec2 uSpriteOffset;
  uniform vec2 uUvScroll;
  uniform vec2 uUvMultOffset;
  uniform vec2 uSpriteRepeat;
  uniform vec2 uMultRepeat;
  uniform vec4 uTintRgba;
  uniform bool uColorMultiply;
  uniform float uOpacity;
  uniform bool uAdditive;
  uniform float uEmissiveStrength;
  uniform float uFresnel;
  uniform vec3 uFresnelColor;
  uniform samplerCube uEnvMap;
  uniform bool uHasEnvMap;
  uniform float uReflectMix;
  uniform float uUvRotation;
  uniform bool uUvRotationSafeMargin;
  uniform float uFlipNormal;
  uniform float uAlphaCutoff;
  uniform bool uAlphaTest;
  uniform float uPaletteCount;
  uniform float uPaletteSelector;
  uniform vec4 uPaletteMixMask;
  uniform bool uUseColorLookUp;
  uniform vec2 uColorLookUpScales;
  uniform float uColorLookUpTypeX;
  uniform float uColorLookUpTypeY;
  uniform sampler2D uErosionMap;
  uniform bool uHasErosion;
  uniform float uErosionDrive;
  uniform vec4 uErosionChannelMixer;
  uniform bool uSoftAlpha;
  uniform sampler2D uDistortionMap;
  uniform bool uHasDistortion;
  uniform float uDistortionStrength;
  uniform bool uSoftDepthFade;
  uniform float uGroundZ;
  uniform float uSoftDepthRange;
  uniform bool uUseSceneDepth;
  uniform sampler2D uSceneDepthMap;
  uniform vec2 uSceneDepthResolution;
  uniform float uSceneDepthFadeRange;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  vec2 rotateUv(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 centered = uv - 0.5;
    return vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y) + 0.5;
  }

  vec2 spriteUv(vec2 uv, vec2 spriteOffset, vec2 scroll, vec2 repeat) {
    vec2 scaled = uv * repeat + spriteOffset + scroll;
    if (uUvRotationSafeMargin) {
      return clamp(scaled, spriteOffset, spriteOffset + repeat);
    }
    return fract(scaled);
  }

  float paletteSampleIndex(vec4 src) {
    return dot(src, uPaletteMixMask);
  }

  float colorLookUpChannel(vec4 src, float typeVal) {
    if (typeVal < 0.5) return 0.0;
    if (typeVal < 1.5) return src.r;
    if (typeVal < 2.5) return src.g;
    if (typeVal < 3.5) return src.b;
    return src.a;
  }

  // ValueColor (ritual) está em sRGB; textura já vem em linear (sRGB decode na GPU).
  vec3 srgbToLinear(vec3 c) {
    vec3 lo = c / 12.92;
    vec3 hi = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(lo, hi, step(0.04045, c));
  }

  // Color × birthColor × textura (linear). Tint ritual em sRGB; uMap já vem linear (decode GPU).
  vec4 applyValueColorTint(vec4 tex) {
    vec3 tintLin = srgbToLinear(clamp(uTintRgba.rgb, 0.0, 1.0));
    tex.rgb *= tintLin;
    tex.a *= uTintRgba.a;
    return tex;
  }

  vec4 blendParticleColor(vec4 tex, vec4 colorTex, bool multiplyMode) {
    if (uAdditive) {
      tex.rgb += colorTex.rgb * colorTex.a;
      tex.a = max(tex.a, colorTex.a);
      return tex;
    }
    if (multiplyMode) {
      tex.rgb *= colorTex.rgb;
      tex.a *= colorTex.a;
    } else {
      tex.rgb = mix(tex.rgb, colorTex.rgb, colorTex.a);
      tex.a = max(tex.a, colorTex.a * 0.5);
    }
    return tex;
  }

  void main() {
    vec2 baseUv = rotateUv(vUv, uUvRotation);
    vec2 uvMain = spriteUv(baseUv, uSpriteOffset, uUvScroll, uSpriteRepeat);

    if (uHasDistortion && uDistortionStrength > 0.0001) {
      vec4 distortSample = texture2D(uDistortionMap, uvMain);
      vec2 warp = (distortSample.rg - 0.5) * 2.0 * uDistortionStrength;
      uvMain = fract(uvMain + warp);
    }

    vec4 tex = texture2D(uMap, uvMain);

    if (uHasColor) {
      vec2 colorUv = spriteUv(baseUv, uSpriteOffset, uUvScroll, uSpriteRepeat);
      if (uUseColorLookUp) {
        float lu = colorLookUpChannel(tex, uColorLookUpTypeX) * uColorLookUpScales.x;
        float lv = colorLookUpChannel(tex, uColorLookUpTypeY) * uColorLookUpScales.y;
        colorUv = vec2(lu, lv);
      }
      vec4 colorTex = texture2D(uColorMap, colorUv);
      tex = blendParticleColor(tex, colorTex, uColorMultiply);
    }

    if (uHasPalette) {
      float idx = paletteSampleIndex(tex);
      float uPal = clamp((uPaletteSelector + idx) / uPaletteCount, 0.0, 1.0);
      vec4 grad = texture2D(uPaletteMap, vec2(uPal, 0.5));
      if (uAdditive) {
        tex.rgb = grad.rgb * max(tex.a, grad.a);
        tex.a = max(tex.a, grad.a);
      } else {
        tex.rgb = mix(tex.rgb, grad.rgb, grad.a * tex.a);
        tex.a = max(tex.a, grad.a * tex.a);
      }
    }

    if (uHasMult) {
      vec2 multScaled = baseUv * uMultRepeat + uUvMultOffset;
      vec2 uvMult = uUvRotationSafeMargin
        ? clamp(multScaled, vec2(0.0), vec2(1.0))
        : fract(multScaled);
      vec4 mult = texture2D(uMultMap, uvMult);
      if (uAdditive) {
        tex.rgb += mult.rgb * mult.a;
      } else {
        tex.rgb *= mult.rgb;
      }
      tex.a *= mult.a;
    }

    tex = applyValueColorTint(tex);
    if (uAdditive) {
      tex.rgb *= uEmissiveStrength;
    }

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 N = normalize(vWorldNormal) * (uFlipNormal > 0.5 ? -1.0 : 1.0);
    float rim = pow(1.0 - max(dot(N, viewDir), 0.0), 2.8);

    if (uHasEnvMap && uReflectMix > 0.001) {
      vec3 reflectDir = reflect(-viewDir, N);
      vec3 env = textureCube(uEnvMap, reflectDir).rgb;
      float fac = rim * uReflectMix;
      if (uAdditive) {
        tex.rgb += env * fac;
      } else {
        tex.rgb = mix(tex.rgb, env * uFresnelColor, fac);
      }
    } else if (uFresnel > 0.001) {
      tex.rgb += uFresnelColor * rim * uFresnel;
    }

    if (uHasErosion) {
      vec4 erosionSample = texture2D(uErosionMap, uvMain);
      float erosionMask = dot(erosionSample, uErosionChannelMixer);
      float feather = smoothstep(0.0, 0.35, uErosionDrive);
      tex.a *= mix(erosionMask, 1.0, feather);
    }

    float alpha = tex.a * uOpacity;
    if (uSoftAlpha) {
      alpha = smoothstep(0.0, 0.35, alpha) * uOpacity;
    }
    if (uSoftDepthFade) {
      float aboveGround = max(vWorldPos.z - uGroundZ, 0.0);
      float depthFade = 1.0 - smoothstep(0.0, uSoftDepthRange, aboveGround);
      alpha *= depthFade;
    }
    if (uUseSceneDepth) {
      vec2 depthUv = gl_FragCoord.xy / uSceneDepthResolution;
      float sceneD = texture2D(uSceneDepthMap, depthUv).r;
      float behind = max(gl_FragCoord.z - sceneD, 0.0);
      alpha *= 1.0 - smoothstep(0.0, uSceneDepthFadeRange, behind);
    }
    if (uAlphaTest && alpha < uAlphaCutoff) discard;
    if (uAdditive) {
      gl_FragColor = vec4(tex.rgb * alpha, alpha);
    } else {
      gl_FragColor = vec4(tex.rgb, alpha);
    }
  }
`
