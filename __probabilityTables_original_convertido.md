"Characters/Brand/Skins/Skin0/Particles/Brand_Base_Dance" = VfxSystemDefinitionData {
    particleName: string = "Brand_Base_Dance"
    particlePath: string = "Characters/Brand/Skins/Skin0/Particles/Brand_Base_Dance"
    soundPersistentDefault: string = "Play_sfx_Brand_Dance3D_buffactivate"
    complexEmitterDefinitionData: list[pointer] = {
        VfxEmitterDefinitionData {
            blendMode: u8 = 4
            depthBiasFactors: vec2 = { 0, -50 }
            emitterName: string = "prestige_up_star2"
            isRandomStartFrame: flag = true
            particleLinger: option[f32] = {
                4
            }
            pass: i16 = 99
            texture: string = "ASSETS/Characters/Brand/Skins/Base/Particles/Brand_Base_Spark_Orange.tex"
            timeBeforeFirstEmission: f32 = 0.05
            rate: embed = ValueFloat {
                constantValue: f32 = 10
            }
            particleLifetime: embed = ValueFloat {
                constantValue: f32 = 0.8
                dynamics: pointer = VfxAnimatedFloatVariableData {
                    times: list[f32] = {
                        0
                    }
                    values: list[f32] = {
                        0.8
                    }
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
                }
            }
            birthVelocity: embed = ValueVector3 {
                constantValue: vec3 = { 0, 200, 0 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 0, 200, 0 }
                    }
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
                }
            }
            birthDrag: embed = ValueVector3 {
                constantValue: vec3 = { 0, 3, 0 }
            }
            drag: embed = ValueVector3 {
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                        1
                    }
                    values: list[vec3] = {
                        { 0, 0, 0 }
                        { 0, 0, 0 }
                    }
                }
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
            EmitterPosition: embed = ValueVector3 {
                constantValue: vec3 = { 0, 200, 0 }
            }
            birthColor: embed = ValueColor {
                constantValue: vec4 = { 1, 1, 1, 0.8 }
            }
            birthRotation0: embed = ValueVector3 {
                constantValue: vec3 = { 90, 0, 0 }
            }
            birthScale0: embed = ValueVector3 {
                constantValue: vec3 = { 20, 80, 45 }
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                    }
                    values: list[vec3] = {
                        { 20, 80, 45 }
                    }
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
                }
            }
            scale0: embed = ValueVector3 {
                dynamics: pointer = VfxAnimatedVector3fVariableData {
                    times: list[f32] = {
                        0
                        0.2
                        1
                    }
                    values: list[vec3] = {
                        { 2, 2, 3 }
                        { 4, 3, 2 }
                        { 0, 1, 1 }
                    }
                }
            }
            SpawnShape: pointer = VfxShapeCylinder {
                radius: f32 = 10
            }
            primitive: pointer = VfxPrimitiveRay {}
        }
    }
}
