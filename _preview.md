VfxSystemDefinitionData {
    complexEmitterDefinitionData: list[pointer] = {
        VfxEmitterDefinitionData {
            rate: embed = ValueFloat {
                constantValue: f32 = 3
            }
            particleLifetime: embed = ValueFloat {
                constantValue: f32 = 0.6
                dynamics: pointer = VfxAnimatedFloatVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                1
                                1.5
                            }
                        }
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[f32] = {
                        0.6
                    }
                }
            }
            particleLinger: option[f32] = {
                10.6
            }
            lifetime: option[f32] = {
                1
            }
            isSingleParticle: flag = true
            emitterName: string = "Ring"
            birthVelocity: embed = ValueVector3 {
                constantValue: vec3 = { 0, -200, 0 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {}
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0.5
                                1
                            }
                        }
                        VfxProbabilityTableData {}
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 0, -200, 0 }
                    }
                }
            }
            EmitterPosition: embed = ValueVector3 {
                constantValue: vec3 = { 0, 160, 0 }
            }
            FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                scaleBirthScaleByBoundObjectSize: f32 = 0.0055
            }
            primitive: pointer = VfxPrimitiveMesh {
                mMesh: embed = VfxMeshDefinitionData {
                    mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                }
            }
            particleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
            blendMode: u8 = 1
            Color: embed = ValueColor {
                constantValue: vec4 = { 1, 1, 1, 0.5 }
                dynamics: pointer = VfxAnimatedColorVariableData {
                    times: list[f32] = {
                        0
                        0.8
                        1
                    }
                    values: list[vec4] = {
                        { 1, 1, 1, 0.5 }
                        { 1, 1, 1, 0.5 }
                        { 1, 1, 1, 0 }
                    }
                }
            }
            pass: i16 = 5
            reflectionDefinition: pointer = VfxReflectionDefinitionData {
                reflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                reflectionOpacityDirect: f32 = 0.25
                reflectionOpacityGlancing: f32 = 0.1
                reflectionFresnel: f32 = 0.1
                reflectionFresnelColor: vec4 = { 1, 1, 1, 0.5 }
            }
            birthRotation0: embed = ValueVector3 {
                constantValue: vec3 = { 0, 360, 20 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {}
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0
                                1
                            }
                        }
                        VfxProbabilityTableData {}
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 0, 360, 20 }
                    }
                }
            }
            birthScale0: embed = ValueVector3 {
                constantValue: vec3 = { 40, 40, 40 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0.6
                                1.2
                            }
                        }
                        VfxProbabilityTableData {}
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0.6
                                1.2
                            }
                        }
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 40, 40, 40 }
                    }
                }
            }
            texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
            birthUvScrollRate: embed = ValueVector2 {
                constantValue: vec2 = { 0, 1 }
            }
            birthUVOffset: embed = ValueVector2 {
                constantValue: vec2 = { 0, 0.4 }
            }
        }
        VfxEmitterDefinitionData {
            rate: embed = ValueFloat {
                constantValue: f32 = 8
            }
            particleLifetime: embed = ValueFloat {
                constantValue: f32 = 0.2
                dynamics: pointer = VfxAnimatedFloatVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0.5
                                1.75
                            }
                        }
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[f32] = {
                        0.2
                    }
                }
            }
            particleLinger: option[f32] = {
                10.2
            }
            lifetime: option[f32] = {
                1
            }
            isSingleParticle: flag = true
            emitterName: string = "Splat"
            EmitterPosition: embed = ValueVector3 {
                constantValue: vec3 = { 0, 160, 0 }
            }
            FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                scaleBirthScaleByBoundObjectSize: f32 = 0.0055
            }
            particleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
            blendMode: u8 = 1
            Color: embed = ValueColor {
                dynamics: pointer = VfxAnimatedColorVariableData {
                    times: list[f32] = {
                        0
                        0.5
                        1
                    }
                    values: list[vec4] = {
                        { 1, 1, 1, 1 }
                        { 1, 1, 1, 1 }
                        { 1, 1, 1, 0 }
                    }
                }
            }
            pass: i16 = 1
            miscRenderFlags: u8 = 1
            isRandomStartFrame: flag = true
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
                                0
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
            birthScale0: embed = ValueVector3 {
                constantValue: vec3 = { 25, 100, 0 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                1
                                1.5
                            }
                        }
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                1
                                1.5
                            }
                        }
                        VfxProbabilityTableData {}
                    }
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 25, 100, 0 }
                    }
                }
            }
            scale0: embed = ValueVector3 {
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                        0.2
                        0.3
                        0.511
                        0.703
                        1
                    }
                    values: list[vec3] = {
                        { 0.25, 0.085, 1 }
                        { 0.724, 0.683, 1 }
                        { 0.832, 0.822, 1 }
                        { 0.87, 0.908, 1 }
                        { 0.867, 0.957, 1 }
                        { 0.864, 1, 1 }
                    }
                }
            }
            texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
            numFrames: u16 = 16
            texDiv: vec2 = { 2, 2 }
        }
        VfxEmitterDefinitionData {
            rate: embed = ValueFloat {
                constantValue: f32 = 5
            }
            particleLifetime: embed = ValueFloat {
                constantValue: f32 = 1
            }
            particleLinger: option[f32] = {
                11
            }
            lifetime: option[f32] = {
                0.8
            }
            isSingleParticle: flag = true
            emitterName: string = "Juice"
            birthVelocity: embed = ValueVector3 {
                constantValue: vec3 = { 800, 2000, 800 }
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
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0
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
                    values: list[vec3] = {
                        { 800, 2000, 800 }
                    }
                }
            }
            birthDrag: embed = ValueVector3 {
                constantValue: vec3 = { 2, 10, 2 }
            }
            worldAcceleration: embed = IntegratedValueVector3 {
                constantValue: vec3 = { 0, -1200, 0 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 0, -1200, 0 }
                    }
                }
            }
            primitive: pointer = VfxPrimitiveMesh {
                mMesh: embed = VfxMeshDefinitionData {
                    mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                }
            }
            particleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
            blendMode: u8 = 1
            Color: embed = ValueColor {
                constantValue: vec4 = { 1, 1, 1, 0.9 }
            }
            pass: i16 = 10
            reflectionDefinition: pointer = VfxReflectionDefinitionData {
                reflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                reflectionFresnel: f32 = 0.22
                reflectionFresnelColor: vec4 = { 0.1, 0.3, 0.08, 1 }
            }
            birthRotation0: embed = ValueVector3 {
                constantValue: vec3 = { 180, 180, 180 }
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
                    values: list[vec3] = {
                        { 180, 180, 180 }
                    }
                }
            }
            birthRotationalVelocity0: embed = ValueVector3 {
                constantValue: vec3 = { 500, 500, 500 }
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
                    values: list[vec3] = {
                        { 500, 500, 500 }
                    }
                }
            }
            isLocalOrientation: flag = false
            birthScale0: embed = ValueVector3 {
                constantValue: vec3 = { 20, 20, 20 }
            }
            scale0: embed = ValueVector3 {
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                        0.106
                        0.2
                        1
                    }
                    values: list[vec3] = {
                        { 0, 0, 0 }
                        { 0.763, 0.348, 0.546 }
                        { 0.99, 0.785, 0.896 }
                        { 1, 1, 1 }
                    }
                }
            }
            texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Color.tex"
            birthUVOffset: embed = ValueVector2 {
                constantValue: vec2 = { 1, 1 }
                dynamics: pointer = VfxAnimatedVector2fVariableData {
                    probabilityTables: list[pointer] = {
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0
                                1
                            }
                        }
                        VfxProbabilityTableData {
                            keyTimes: list[f32] = {
                                0
                                1
                            }
                            keyValues: list[f32] = {
                                0
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
    particleName: string = "Zac_Base_Q_tar"
    particlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar"
    soundOnCreateDefault: string = "Play_sfx_Zac_ZacQHit_hit"
    flags: u16 = 198
}