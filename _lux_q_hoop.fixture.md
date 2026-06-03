# Fixture Lux_Base_Q_mis (16 emitters) — golden tests em luxQHoop.fixture.test.ts
# hoop1/hoop2: anéis; END_Beam/rays; trails; Core3; Sparks_; ground glows; Left*

    "Characters/Lux/Skins/Skin0/Particles/Lux_Base_Q_mis" = VfxSystemDefinitionData {
        complexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 30
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.5
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.9
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1.5
                                    0.7
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            0.5
                        }
                    }
                }
                particleLinger: option[f32] = {
                    0.5
                }
                lifetime: option[f32] = {
                    10
                }
                emitterName: string = "hoop1"
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 200, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 0, 200, 0 }
                        }
                    }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 3, 0 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitOffset: embed = ValueVector3 {
                        constantValue: vec3 = { 30, 0, 0 }
                    }
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                probabilityTables: list[pointer] = {
                                    VfxProbabilityTableData {
                                        keyTimes: list[f32] = {
                                            0
                                            1
                                        }
                                        keyValues: list[f32] = {
                                            0
                                            360
                                        }
                                    }
                                }
                                times: list[f32] = {
                                    0
                                }
                                values: list[f32] = {
                                    1
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                particleColorTexture: string = "ASSETS/Particles/color-spectralbell.tex"
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.029999238 }
                }
                colorLookUpScales: vec2 = { 1, 0.5 }
                miscRenderFlags: u8 = 1
                isUniformScale: flag = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 60, 50, 50 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.35
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 60, 50, 50 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            1
                        }
                        values: list[vec3] = {
                            { 1, 1, 1 }
                            { 0.5, 0.5, 0.5 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Z_Bokeh_Dots_4x4.tex"
                startFrame: u16 = 2
                texDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 1.15
                }
                lifetime: option[f32] = {
                    1
                }
                isSingleParticle: flag = true
                emitterName: string = "Core3"
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.37999544 }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0.9
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 0.647059, 0.015686, 0.015686, 0 }
                        }
                    }
                }
                pass: i16 = 2
                miscRenderFlags: u8 = 1
                isGroundLayer: flag = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 550, 440, 1.1 }
                }
                scale0: embed = ValueVector3 {
                    constantValue: vec3 = { 0.4, 0.4, 0.4 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.9
                            0.99
                        }
                        values: list[vec3] = {
                            { 0.4, 0.4, 0.4 }
                            { 0.4, 0.4, 0.4 }
                            { 0, 0, 0 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_spark.tex"
                paletteDefinition: pointer = VfxPaletteDefinitionData {
                    paletteTexture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Flame_trail_gradient.tex"
                    palleteSrcMixColor: embed = ValueColor {
                        constantValue: vec4 = { 1, 0, 0, 0 }
                    }
                    paletteSelector: embed = ValueVector3 {
                        constantValue: vec3 = { 6, 0, 0 }
                    }
                    paletteCount: i32 = 10
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 60
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0
                                    0.8
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            60
                        }
                    }
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.35
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1.5
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            0.35
                        }
                    }
                }
                particleLinger: option[f32] = {
                    1
                }
                lifetime: option[f32] = {
                    1
                }
                emitterName: string = "Sparks_"
                birthOrbitalVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0.1, -1.1, 0.1 }
                }
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -50, -200, -30 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.499
                                    0.5
                                    1
                                }
                                keyValues: list[f32] = {
                                    1
                                    1
                                    -1
                                    -1
                                }
                            }
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.8
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    -1
                                    -5
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { -50, -200, -30 }
                        }
                    }
                }
                worldAcceleration: embed = IntegratedValueVector3 {
                    constantValue: vec3 = { 0, 200, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 0, 200, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitOffset: embed = ValueVector3 {
                        constantValue: vec3 = { 2, 2, 2 }
                        dynamics: pointer = VfxAnimatedVector3fVariableData {
                            probabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -30
                                        30
                                    }
                                }
                                VfxProbabilityTableData {}
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -25
                                        25
                                    }
                                }
                            }
                            times: list[f32] = {
                                0
                            }
                            values: list[vec3] = {
                                { 2, 2, 2 }
                            }
                        }
                    }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.2
                            0.4
                            0.6
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 0.85098, 0.019608, 0.749004 }
                            { 0.066667, 0.92549, 0.784314, 1 }
                            { 0.094118, 0.741176, 0.921569, 0.517601 }
                            { 0.07451, 0.109804, 0.792157, 0.231403 }
                            { 0.537255, 0.090196, 0.796078, 0 }
                        }
                    }
                }
                pass: i16 = 105
                isDirectionOriented: flag = true
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 0, 90 }
                }
                birthRotationalVelocity0: embed = ValueVector3 {
                    constantValue: vec3 = { 300, 0, 0 }
                }
                directionVelocityScale: f32 = 0.003
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 18, 18, 18 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.65
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 18, 18, 18 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.1
                            1
                        }
                        values: list[vec3] = {
                            { 2, 2, 2 }
                            { 1.5, 1.5, 1.5 }
                            { 0.1, 0.1, 2 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_spark.tex"
                paletteDefinition: pointer = VfxPaletteDefinitionData {
                    paletteTexture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Flame_trail_gradient.tex"
                    palleteSrcMixColor: embed = ValueColor {
                        constantValue: vec4 = { 1, 0, 0, 0 }
                    }
                    paletteSelector: embed = ValueVector3 {
                        constantValue: vec3 = { 9, 0, 0 }
                    }
                    paletteCount: i32 = 10
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 200
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.15
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.9
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1.5
                                    4
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            0.15
                        }
                    }
                }
                particleLinger: option[f32] = {
                    1
                }
                lifetime: option[f32] = {
                    10
                }
                emitterName: string = "hoop2"
                birthOrbitalVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 2, 0 }
                }
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 300, 150, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 300, 150, 0 }
                        }
                    }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 9, 2, 9 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitOffset: embed = ValueVector3 {
                        constantValue: vec3 = { 40, 0, 0 }
                    }
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                probabilityTables: list[pointer] = {
                                    VfxProbabilityTableData {
                                        keyTimes: list[f32] = {
                                            0
                                            1
                                        }
                                        keyValues: list[f32] = {
                                            0
                                            360
                                        }
                                    }
                                }
                                times: list[f32] = {
                                    0
                                }
                                values: list[f32] = {
                                    1
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 50, 0 }
                }
                particleColorTexture: string = "ASSETS/Particles/color-spectralbell.tex"
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.4500038 }
                }
                colorLookUpScales: vec2 = { 1, 0.5 }
                miscRenderFlags: u8 = 1
                isUniformScale: flag = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 30, 50, 50 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.35
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 30, 50, 50 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            1
                        }
                        values: list[vec3] = {
                            { 1, 1, 1 }
                            { 0.5, 0.5, 0.5 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_Mote.tex"
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 10
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.95
                }
                lifetime: option[f32] = {
                    1.8
                }
                isSingleParticle: flag = true
                emitterName: string = "END_Beam_ROTATING"
                importance: u8 = 3
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.30000764 }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.9
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 0.96862745, 0.8039216, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                pass: i16 = 500
                alphaRef: u8 = 0
                miscRenderFlags: u8 = 1
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 360, 0, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                birthRotationalVelocity0: embed = ValueVector3 {
                    constantValue: vec3 = { 150, 0, 0 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 10, 200, 1 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    2
                                }
                            }
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.2
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 10, 200, 1 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    constantValue: vec3 = { 0.8, 0.8, 0.8 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.8
                            1
                        }
                        values: list[vec3] = {
                            { 0.16, 0.8, 0.8 }
                            { 0.8, 0.8, 0.8 }
                            { 0.08, 0.08, 0.08 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Diana_Skin11_R_Glow.tex"
                uvRotation: embed = ValueFloat {
                    constantValue: f32 = 90
                }
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    uvScaleMult: embed = ValueVector2 {
                        constantValue: vec2 = { 0.1, 1 }
                    }
                    ParticleIntegratedUvScrollMult: embed = IntegratedValueVector2 {
                        constantValue: vec2 = { -1, 0 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            times: list[f32] = {
                                0
                                1
                            }
                            values: list[vec2] = {
                                { 0, 0 }
                                { -1, 0 }
                            }
                        }
                    }
                    birthUVOffsetMult: embed = ValueVector2 {
                        constantValue: vec2 = { 1, 1 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            probabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            times: list[f32] = {
                                0
                            }
                            values: list[vec2] = {
                                { 1, 1 }
                            }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.95
                }
                lifetime: option[f32] = {
                    1.8
                }
                isSingleParticle: flag = true
                emitterName: string = "END_Ground_Core"
                importance: u8 = 3
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    emitOffset: vec3 = { 0, -130, 0 }
                }
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.17999542 }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.4
                            0.9
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 0.96862745, 0.8039216, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                pass: i16 = 5
                alphaRef: u8 = 0
                miscRenderFlags: u8 = 1
                isGroundLayer: flag = true
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 90, 0, 0 }
                }
                isLocalOrientation: flag = false
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 200, 200, 1 }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.75
                            1
                        }
                        values: list[vec3] = {
                            { 0.8, 1, 1 }
                            { 2, 2, 2 }
                            { 1, 1, 1 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Diana_Skin11_R_Glow.tex"
                uvRotation: embed = ValueFloat {
                    constantValue: f32 = 90
                }
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    uvScaleMult: embed = ValueVector2 {
                        constantValue: vec2 = { 0.1, 1 }
                    }
                    ParticleIntegratedUvScrollMult: embed = IntegratedValueVector2 {
                        constantValue: vec2 = { -1, 0 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            times: list[f32] = {
                                0
                                1
                            }
                            values: list[vec2] = {
                                { 0, 0 }
                                { -1, 0 }
                            }
                        }
                    }
                    birthUVOffsetMult: embed = ValueVector2 {
                        constantValue: vec2 = { 1, 1 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            probabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            times: list[f32] = {
                                0
                            }
                            values: list[vec2] = {
                                { 1, 1 }
                            }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 50
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.5
                }
                lifetime: option[f32] = {
                    1
                }
                emitterName: string = "rays"
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                primitive: pointer = VfxPrimitiveRay {}
                particleColorTexture: string = "ASSETS/Particles/color-rampdown.tex"
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.2500038 }
                }
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 1, 1, 1 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 1, 1, 1 }
                        }
                    }
                }
                isLocalOrientation: flag = false
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 100, 150, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.6
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.6
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 100, 150, 0 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    constantValue: vec3 = { 1.3, 1.3, 1.3 }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_P_RainbowRay.tex"
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 1.15
                }
                lifetime: option[f32] = {
                    1
                }
                isSingleParticle: flag = true
                emitterName: string = "Temp_GroundGlow"
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    emitOffset: vec3 = { 0, -260, -120 }
                }
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.17999542 }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.79607844, 0.7019608, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.07
                            0.2
                            0.75
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.79607844, 0.7019608, 0 }
                            { 1, 0.79607844, 0.7019608, 0.06999313 }
                            { 1, 0.79607844, 0.7019608, 1 }
                            { 1, 0.79607844, 0.7019608, 1 }
                            { 1, 0.79607844, 0.7019608, 0 }
                        }
                    }
                }
                pass: i16 = -99
                alphaRef: u8 = 0
                miscRenderFlags: u8 = 1
                isGroundLayer: flag = true
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 0, 90 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 550, 450, 160 }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Q_Shape.tex"
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    uvScaleMult: embed = ValueVector2 {
                        constantValue: vec2 = { 0.1, 1 }
                    }
                    ParticleIntegratedUvScrollMult: embed = IntegratedValueVector2 {
                        constantValue: vec2 = { -1, 0 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            times: list[f32] = {
                                0
                                1
                            }
                            values: list[vec2] = {
                                { 0, 0 }
                                { -1, 0 }
                            }
                        }
                    }
                    birthUVOffsetMult: embed = ValueVector2 {
                        constantValue: vec2 = { 1, 1 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            probabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            times: list[f32] = {
                                0
                            }
                            values: list[vec2] = {
                                { 1, 1 }
                            }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                lifetime: option[f32] = {
                    1
                }
                isSingleParticle: flag = true
                emitterName: string = "Temp_GroundGlow2"
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    emitOffset: vec3 = { 0, 0, -120 }
                }
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.10000763 }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.9100023, 0.7300069, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.08
                            0.25
                            0.75
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.9100023, 0.7300069, 0 }
                            { 1, 0.9100023, 0.7300069, 0.06999313 }
                            { 1, 0.9100023, 0.7300069, 1 }
                            { 1, 0.9100023, 0.7300069, 1 }
                            { 1, 0.9100023, 0.7300069, 0 }
                        }
                    }
                }
                pass: i16 = -99
                alphaRef: u8 = 0
                miscRenderFlags: u8 = 1
                isGroundLayer: flag = true
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 0, 90 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 250, 100, 160 }
                }
                scale0: embed = ValueVector3 {
                    constantValue: vec3 = { 2, 2, 2 }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Diana_Base_R_Glow.tex"
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    uvScaleMult: embed = ValueVector2 {
                        constantValue: vec2 = { 0.1, 1 }
                    }
                    ParticleIntegratedUvScrollMult: embed = IntegratedValueVector2 {
                        constantValue: vec2 = { -1, 0 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            times: list[f32] = {
                                0
                                1
                            }
                            values: list[vec2] = {
                                { 0, 0 }
                                { -1, 0 }
                            }
                        }
                    }
                    birthUVOffsetMult: embed = ValueVector2 {
                        constantValue: vec2 = { 1, 1 }
                        dynamics: pointer = VfxAnimatedVector2fVariableData {
                            probabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {
                                    keyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    keyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            times: list[f32] = {
                                0
                            }
                            values: list[vec2] = {
                                { 1, 1 }
                            }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 50
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.5
                }
                particleLinger: option[f32] = {
                    0.5
                }
                lifetime: option[f32] = {
                    1.05
                }
                emitterName: string = "Trail5"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -200, -100, 0 }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 3, 3, 3 }
                }
                worldAcceleration: embed = IntegratedValueVector3 {
                    constantValue: vec3 = { 0, -200, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                times: list[f32] = {
                                    0
                                    1
                                }
                                values: list[f32] = {
                                    360
                                    1400
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 50, 0 }
                }
                primitive: pointer = VfxPrimitiveArbitraryTrail {
                    mTrail: embed = VfxTrailDefinitionData {
                        mMode: u8 = 1
                        mCutoff: f32 = 1000
                        mBirthTilingSize: embed = ValueVector3 {
                            constantValue: vec3 = { 500, 0, 0 }
                        }
                    }
                }
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.8 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0.8 }
                            { 1, 1, 1, 0.8 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.9100023, 0.7300069, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.05
                            0.1
                            0.15
                            0.25
                            0.5
                            0.7
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.9100023, 0.7300069, 0 }
                            { 1, 0.9100023, 0.5913017, 0.37000075 }
                            { 0.972549, 0.8850218, 0.70996743, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.4599985 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.22999924 }
                            { 1, 0.9100023, 0.7300069, 0.14999619 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.06999313 }
                            { 0.6200046, 0.5642056, 0.4526076, 0.039993897 }
                            { 0.2901961, 0.2640791, 0.21184513, 0 }
                        }
                    }
                }
                alphaRef: u8 = 0
                disableBackfaceCull: bool = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 100, 0, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.2
                            0.75
                            1
                        }
                        values: list[vec3] = {
                            { 20, 0, 0 }
                            { 100, 0, 0 }
                            { 100, 0, 0 }
                            { 0, 0, 0 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.1
                            1
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 1.5, 0, 0 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    emitterUvScrollRateMult: vec2 = { 1, 0 }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                lifetime: option[f32] = {
                    1
                }
                isSingleParticle: flag = true
                emitterName: string = "Temp_GroundGlow3"
                bindWeight: embed = ValueFloat {
                    constantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    emitOffset: vec3 = { 0, -100, -120 }
                }
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                blendMode: u8 = 1
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.2500038 }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 0.3019608, 0.03529412, 0.627451, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.15
                            0.3
                            0.75
                            1
                        }
                        values: list[vec4] = {
                            { 0.3019608, 0.03529412, 0.627451, 0 }
                            { 0.3019608, 0.03529412, 0.627451, 0.06999313 }
                            { 0.3019608, 0.03529412, 0.627451, 1 }
                            { 0.3019608, 0.03529412, 0.627451, 1 }
                            { 0.3019608, 0.03529412, 0.627451, 0 }
                        }
                    }
                }
                pass: i16 = -999
                alphaRef: u8 = 0
                miscRenderFlags: u8 = 1
                isGroundLayer: flag = true
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 0, 90 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 225, 100, 160 }
                }
                scale0: embed = ValueVector3 {
                    constantValue: vec3 = { 2, 2, 2 }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Diana_Base_R_Glow.tex"
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 50
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.35
                }
                particleLinger: option[f32] = {
                    0.35
                }
                lifetime: option[f32] = {
                    1.05
                }
                emitterName: string = "Trail_small"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -200, -100, 0 }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 3, 3, 3 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                times: list[f32] = {
                                    0
                                    1
                                }
                                values: list[f32] = {
                                    360
                                    1400
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 60, 0 }
                }
                primitive: pointer = VfxPrimitiveArbitraryTrail {
                    mTrail: embed = VfxTrailDefinitionData {
                        mMode: u8 = 1
                        mCutoff: f32 = 1000
                        mBirthTilingSize: embed = ValueVector3 {
                            constantValue: vec3 = { 800, 0, 0 }
                        }
                        mSmoothingMode: u8 = 2
                    }
                }
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.6 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0.6 }
                            { 1, 1, 1, 0.6 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.9100023, 0.7300069, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.05
                            0.1
                            0.15
                            0.25
                            0.5
                            0.7
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.9100023, 0.7300069, 0 }
                            { 1, 0.9100023, 0.5913017, 0.37000075 }
                            { 0.972549, 0.8850218, 0.70996743, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.59000534 }
                            { 1, 0.9100023, 0.7300069, 0.2899977 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.06999313 }
                            { 0.6200046, 0.5642056, 0.4526076, 0.039993897 }
                            { 0.2901961, 0.2640791, 0.21184513, 0 }
                        }
                    }
                }
                alphaRef: u8 = 0
                disableBackfaceCull: bool = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 30, 0, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.2
                            0.75
                            1
                        }
                        values: list[vec3] = {
                            { 6, 0, 0 }
                            { 30, 0, 0 }
                            { 30, 0, 0 }
                            { 0, 0, 0 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.1
                            1
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 0.4, 0, 0 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    emitterUvScrollRateMult: vec2 = { 1, 0 }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 50
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.15
                }
                particleLinger: option[f32] = {
                    0.15
                }
                lifetime: option[f32] = {
                    1.05
                }
                emitterName: string = "Trail_small1"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -200, -100, 0 }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 3, 3, 3 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                times: list[f32] = {
                                    0
                                    1
                                }
                                values: list[f32] = {
                                    360
                                    1400
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 60, 0 }
                }
                primitive: pointer = VfxPrimitiveArbitraryTrail {
                    mTrail: embed = VfxTrailDefinitionData {
                        mMode: u8 = 1
                        mCutoff: f32 = 1000
                        mBirthTilingSize: embed = ValueVector3 {
                            constantValue: vec3 = { 800, 0, 0 }
                        }
                        mSmoothingMode: u8 = 2
                    }
                }
                blendMode: u8 = 4
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.5799954 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0.5799954 }
                            { 1, 1, 1, 0.5799954 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.9100023, 0.7300069, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.05
                            0.1
                            0.15
                            0.25
                            0.5
                            0.7
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.9100023, 0.7300069, 0 }
                            { 1, 0.9100023, 0.5913017, 0.37000075 }
                            { 0.972549, 0.8850218, 0.70996743, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 1 }
                            { 1, 0.9100023, 0.7300069, 0.8399939 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.37999544 }
                            { 0.6200046, 0.5642056, 0.4526076, 0.039993897 }
                            { 0.2901961, 0.2640791, 0.21184513, 0 }
                        }
                    }
                }
                alphaRef: u8 = 0
                disableBackfaceCull: bool = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 10, 0, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.2
                            0.75
                            1
                        }
                        values: list[vec3] = {
                            { 2, 0, 0 }
                            { 10, 0, 0 }
                            { 10, 0, 0 }
                            { 0, 0, 0 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.1
                            1
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 0.4, 0, 0 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 50
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.35
                }
                particleLinger: option[f32] = {
                    0.35
                }
                lifetime: option[f32] = {
                    1.05
                }
                emitterName: string = "Trail_dark"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -200, -100, 0 }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 3, 3, 3 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    emitRotationAngles: list[embed] = {
                        ValueFloat {
                            constantValue: f32 = 1
                            dynamics: pointer = VfxAnimatedFloatVariableData {
                                times: list[f32] = {
                                    0
                                    1
                                }
                                values: list[f32] = {
                                    360
                                    1400
                                }
                            }
                        }
                    }
                    emitRotationAxes: list[vec3] = {
                        { 0, 1.0000001, 0 }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 60, 0 }
                }
                primitive: pointer = VfxPrimitiveArbitraryTrail {
                    mTrail: embed = VfxTrailDefinitionData {
                        mMode: u8 = 1
                        mCutoff: f32 = 1000
                        mBirthTilingSize: embed = ValueVector3 {
                            constantValue: vec3 = { 800, 0, 0 }
                        }
                        mSmoothingMode: u8 = 2
                    }
                }
                blendMode: u8 = 1
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 0.17999542, 0.06999313, 0.39000535, 0.6 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 0.17999542, 0.06999313, 0.39000535, 0.6 }
                            { 0.17999542, 0.06999313, 0.39000535, 0.6 }
                            { 0.17999542, 0.06999313, 0.39000535, 0 }
                        }
                    }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 1, 0.9100023, 0.7300069, 1 }
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.05
                            0.1
                            0.15
                            0.25
                            0.5
                            0.7
                            0.8
                            1
                        }
                        values: list[vec4] = {
                            { 1, 0.9100023, 0.7300069, 0 }
                            { 1, 0.9100023, 0.5913017, 0.37000075 }
                            { 0.972549, 0.8850218, 0.70996743, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 1 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.59000534 }
                            { 1, 0.9100023, 0.7300069, 0.2899977 }
                            { 0.9900053, 0.9009071, 0.72271067, 0.06999313 }
                            { 0.6200046, 0.5642056, 0.4526076, 0.039993897 }
                            { 0.2901961, 0.2640791, 0.21184513, 0 }
                        }
                    }
                }
                pass: i16 = -1
                alphaRef: u8 = 0
                disableBackfaceCull: bool = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 100, 0, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.2
                            0.75
                            1
                        }
                        values: list[vec3] = {
                            { 20, 0, 0 }
                            { 100, 0, 0 }
                            { 100, 0, 0 }
                            { 0, 0, 0 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            0.1
                            1
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 0.4, 0, 0 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_Q_trail.tex"
                textureMult: pointer = VfxTextureMultDefinitionData {
                    textureMult: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_RainbowMult.tex"
                    emitterUvScrollRateMult: vec2 = { 1, 0 }
                }
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 200
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.15
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.9
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1.5
                                    4
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            0.15
                        }
                    }
                }
                particleLinger: option[f32] = {
                    1
                }
                lifetime: option[f32] = {
                    10
                }
                emitterName: string = "Left"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { -500, 20, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { -500, 20, 0 }
                        }
                    }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 11, 2, 11 }
                }
                birthAcceleration: embed = ValueVector3 {
                    constantValue: vec3 = { 1300, 0, 0 }
                }
                worldAcceleration: embed = IntegratedValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeBox {
                    flags: u8 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { -50, 90, -130 }
                }
                particleColorTexture: string = "ASSETS/Particles/color-spectralbell.tex"
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.5000076 }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.35
                            0.5
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 0.14000152 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                colorLookUpScales: vec2 = { 1, 0.5 }
                miscRenderFlags: u8 = 1
                isUniformScale: flag = true
                isGroundLayer: flag = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 30, 50, 50 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.35
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 30, 50, 50 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            1
                        }
                        values: list[vec3] = {
                            { 1, 1, 1 }
                            { 0.5, 0.5, 0.5 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_Mote.tex"
            }
            VfxEmitterDefinitionData {
                rate: embed = ValueFloat {
                    constantValue: f32 = 200
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 0.15
                    dynamics: pointer = VfxAnimatedFloatVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    0.9
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.5
                                    1.5
                                    4
                                }
                            }
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[f32] = {
                            0.15
                        }
                    }
                }
                particleLinger: option[f32] = {
                    1
                }
                lifetime: option[f32] = {
                    10
                }
                emitterName: string = "Left1"
                importance: u8 = 3
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 500, 20, 0 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 500, 20, 0 }
                        }
                    }
                }
                birthDrag: embed = ValueVector3 {
                    constantValue: vec3 = { 11, 2, 11 }
                }
                birthAcceleration: embed = ValueVector3 {
                    constantValue: vec3 = { -1300, 0, 0 }
                }
                worldAcceleration: embed = IntegratedValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 0, 0, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeBox {
                    flags: u8 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    constantValue: vec3 = { 50, 90, -130 }
                }
                particleColorTexture: string = "ASSETS/Particles/color-spectralbell.tex"
                birthColor: embed = ValueColor {
                    constantValue: vec4 = { 1, 1, 1, 0.5000076 }
                }
                Color: embed = ValueColor {
                    dynamics: pointer = VfxAnimatedColorVariableData {
                        times: list[f32] = {
                            0
                            0.35
                            0.5
                            1
                        }
                        values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 0.14000152 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                colorLookUpScales: vec2 = { 1, 0.5 }
                miscRenderFlags: u8 = 1
                isUniformScale: flag = true
                isGroundLayer: flag = true
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 30, 50, 50 }
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        probabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                keyTimes: list[f32] = {
                                    0
                                    1
                                }
                                keyValues: list[f32] = {
                                    0.35
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        times: list[f32] = {
                            0
                        }
                        values: list[vec3] = {
                            { 30, 50, 50 }
                        }
                    }
                }
                scale0: embed = ValueVector3 {
                    dynamics: pointer = VfxAnimatedVector3fVariableData {
                        times: list[f32] = {
                            0
                            1
                        }
                        values: list[vec3] = {
                            { 1, 1, 1 }
                            { 0.5, 0.5, 0.5 }
                        }
                    }
                }
                texture: string = "ASSETS/Characters/Lux/Skins/Base/Particles/Lux_Base_R_Mote.tex"
            }
        }
        particleName: string = "Lux_Base_Q_mis"
        particlePath: string = "Characters/Lux/Skins/Skin0/Particles/Lux_Base_Q_mis"
    }