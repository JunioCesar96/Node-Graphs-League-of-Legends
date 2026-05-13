#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = {
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin10_Skins_Skin11_Skins_Skin12_Skins_Skin13_Skins_Skin14_Skins_Skin15_Skins_Skin16_Skins_Skin17_Skins_Skin18_Skins_Skin19_Skins_Skin2_Skins_Skin20_Skins_Skin21_Skins_Skin22_Skins_Skin23_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin7_Skins_Skin8_Skins_Skin9.bin"
    "DATA/Characters/Zac/Zac.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin14_Skins_Skin15_Skins_Skin16_Skins_Skin17_Skins_Skin18_Skins_Skin19_Skins_Skin2_Skins_Skin20_Skins_Skin21_Skins_Skin22_Skins_Skin23_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin6.bin"
    "DATA/Zac_Skins_Root_Skins_Skin0_Skins_Skin1_Skins_Skin10_Skins_Skin11_Skins_Skin12_Skins_Skin13_Skins_Skin14_Skins_Skin15_Skins_Skin16_Skins_Skin17_Skins_Skin18_Skins_Skin19_Skins_Skin2_Skins_Skin20_Skins_Skin21_Skins_Skin22_Skins_Skin23_Skins_Skin24_Skins_Skin25_Skins_Skin26_Skins_Skin27_Skins_Skin28_Skins_Skin29_Skins_Skin3_Skins_Skin30_Skins_Skin31_Skins_Skin32_Skins_Skin33_Skins_Skin34_Skins_Skin35_Skins_Skin36_Skins_Skin37_Skins_Skin38_Skins_Skin39_Skins_Skin4_Skins_Skin40_Skins_Skin41_Skins_Skin5_Skins_Skin6_Skins_Skin7_Skins_Skin8_Skins_Skin9.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin10_Skins_Skin11_Skins_Skin12_Skins_Skin13_Skins_Skin14_Skins_Skin15_Skins_Skin16_Skins_Skin17_Skins_Skin18_Skins_Skin19_Skins_Skin2_Skins_Skin20_Skins_Skin21_Skins_Skin22_Skins_Skin23_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin6_Skins_Skin7_Skins_Skin8_Skins_Skin9.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin10_Skins_Skin11_Skins_Skin12_Skins_Skin13_Skins_Skin14_Skins_Skin15_Skins_Skin16_Skins_Skin17_Skins_Skin18_Skins_Skin19_Skins_Skin20_Skins_Skin21_Skins_Skin22_Skins_Skin23_Skins_Skin7_Skins_Skin8_Skins_Skin9.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin10_Skins_Skin11_Skins_Skin12_Skins_Skin13_Skins_Skin2_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin6_Skins_Skin7_Skins_Skin8_Skins_Skin9.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin2_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin6.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin2_Skins_Skin3_Skins_Skin4_Skins_Skin5.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin3_Skins_Skin4_Skins_Skin5_Skins_Skin6.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin2_Skins_Skin3_Skins_Skin4_Skins_Skin5.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin3_Skins_Skin4_Skins_Skin5.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1_Skins_Skin6.bin"
    "DATA/Zac_Skins_Skin0_Skins_Skin1.bin"
}
entries: map[hash,embed] = {
    "Characters/Zac/Skins/Skin0" = SkinCharacterDataProperties {
        SkinClassification: u32 = 1
        ChampionSkinName: string = "Zac"
        MetaDataTags: string = "faction:zaun,gender:male"
        Loadscreen: embed = CensoredImage {
            Image: string = "ASSETS/Characters/Zac/Skins/Base/ZacLoadScreen.tex"
        }
        SkinAudioProperties: embed = SkinAudioProperties {
            TagEventList: list[string] = {
                "Zac"
            }
            BankUnits: list2[embed] = {
                BankUnit {
                    Name: string = "Zac_Base_VO"
                    BankPath: list[string] = {
                        "ASSETS/Sounds/Wwise2016/VO/en_US/Characters/Zac/Skins/Base/Zac_Base_VO_audio.bnk"
                        "ASSETS/Sounds/Wwise2016/VO/en_US/Characters/Zac/Skins/Base/Zac_Base_VO_events.bnk"
                        "ASSETS/Sounds/Wwise2016/VO/en_US/Characters/Zac/Skins/Base/Zac_Base_VO_audio.wpk"
                    }
                    Events: list[string] = {
                        "Play_vo_Zac_Attack2DGeneral"
                        "Play_vo_Zac_Death3D"
                        "Play_vo_Zac_Laugh3DGeneral"
                        "Play_vo_Zac_Move2DStandard"
                        "Play_vo_Zac_Spell3DE2Cast"
                        "Play_vo_Zac_Spell3DE2End"
                        "Play_vo_Zac_Spell3DPReviveStart"
                        "Play_vo_Zac_Taunt3DGeneral"
                        "Play_vo_Zac_ZacBasicAttack2_cast3D"
                        "Play_vo_Zac_ZacBasicAttack_cast3D"
                        "Play_vo_Zac_ZacCritAttack_cast3D"
                        "Play_vo_Zac_ZacE_cast3D"
                        "Play_vo_Zac_ZacQ_cast3D"
                        "Play_vo_Zac_ZacR_buffactivate"
                        "Play_vo_Zac_ZacR_cast3D"
                        "Play_vo_Zac_ZacW_cast3D"
                    }
                    VoiceOver: bool = true
                }
                BankUnit {
                    Name: string = "Zac_Base_SFX"
                    BankPath: list[string] = {
                        "ASSETS/Sounds/Wwise2016/SFX/Characters/Zac/Skins/Base/Zac_Base_SFX_audio.bnk"
                        "ASSETS/Sounds/Wwise2016/SFX/Characters/Zac/Skins/Base/Zac_Base_SFX_events.bnk"
                    }
                    Events: list[string] = {
                        "Play_sfx_Zac_Bloblet_Death"
                        "Play_sfx_Zac_Dance"
                        "Play_sfx_Zac_death3d_cast"
                        "Play_sfx_Zac_Joke3D_buffactivate"
                        "Play_sfx_Zac_Joke3D_buffactivate2"
                        "Play_sfx_Zac_Laugh3D_buffactivate"
                        "Play_sfx_Zac_Laugh3D_buffactivate2"
                        "Play_sfx_Zac_Recallleadin"
                        "Play_sfx_Zac_Respawn"
                        "Play_sfx_Zac_Taunt3D_buffactivate"
                        "Play_sfx_Zac_Zac_blastcone_fly"
                        "Play_sfx_Zac_ZacBasicAttack2_OnCast"
                        "Play_sfx_Zac_ZacBasicAttack2_OnHit"
                        "Play_sfx_Zac_ZacBasicAttack_OnCast"
                        "Play_sfx_Zac_ZacBasicAttack_OnHit"
                        "Play_sfx_Zac_ZacCritAttack_OnCast"
                        "Play_sfx_Zac_ZacCritAttack_OnHit"
                        "Play_sfx_Zac_ZacE_hit"
                        "Play_sfx_Zac_ZacE_OnBuffActivate"
                        "Play_sfx_Zac_ZacE_OnCast"
                        "Play_sfx_Zac_ZacEMove_buffactivate"
                        "Play_sfx_Zac_ZacEMove_missilelaunch"
                        "Play_sfx_Zac_ZacQ_OnCast"
                        "Play_sfx_Zac_ZacQattack_OnCast"
                        "Play_sfx_Zac_ZacQattack_OnHit"
                        "Play_sfx_Zac_ZacQmissile_OnHit"
                        "Play_sfx_Zac_ZacQyankRoot_OnBuffDeactivate"
                        "Play_sfx_Zac_ZacR_bounce_lua"
                        "Play_sfx_Zac_ZacR_OnCast"
                        "Play_sfx_Zac_zacrebirthstart_OnBuffActivate"
                        "Play_sfx_Zac_ZacW_OnCast"
                        "Play_sfx_Zac_ZacWPassive_buffactivate_heal"
                        "Play_sfx_Zac_ZacWPassive_buffdeactivate_death"
                        "Stop_sfx_Zac_zacrebirthstart_OnBuffActivate"
                    }
                }
            }
        }
        SkinAnimationProperties: embed = SkinAnimationProperties {
            AnimationGraphData: link = "Characters/Zac/Animations/Skin0"
        }
        SkinMeshProperties: embed = SkinMeshDataProperties {
            Skeleton: string = "ASSETS/Characters/Zac/Skins/Base/Zac_Base.skl"
            SimpleSkin: string = "ASSETS/Characters/Zac/Skins/Base/Zac_Base.skn"
            Texture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_TX_CM.tex"
            GlossTexture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_TX_GM.tex"
            SkinScale: f32 = 0.949999988
            SelfIllumination: f32 = 1
            OverrideBoundingBox: option[vec3] = {
                { 115, 260, 115 }
            }
            FresnelColor: rgba = { 20, 77, 26, 255 }
            Fresnel: f32 = 0.219999999
            ReflectionMap: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
            ReflectionOpacityDirect: f32 = 0.5
            ReflectionOpacityGlancing: f32 = 0.400000006
            ReflectionFresnel: f32 = 0.600000024
            ReflectionFresnelColor: rgba = { 153, 153, 153, 255 }
            InitialSubmeshToHide: string = "Ult Puddle Tail"
            MaterialOverride: list[embed] = {
                SkinMeshDataProperties_MaterialOverride {
                    Texture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_puddle_TX_CM.tex"
                    GlossTexture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_puddle_TX_GM.tex"
                    Submesh: string = "Puddle"
                }
                SkinMeshDataProperties_MaterialOverride {
                    Texture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_ult_TX_CM.tex"
                    GlossTexture: string = "ASSETS/Characters/Zac/Skins/Base/Zac_base_ult_TX_GM.tex"
                    Submesh: string = "Ult"
                }
            }
        }
        ArmorMaterial: string = "Flesh"
        IdleParticlesEffects: list[embed] = {
            SkinCharacterDataProperties_CharacterIdleEffect {
                EffectName: string = "DATA/Particles/Malphite_Glacial_Idle.troy"
            }
        }
        mContextualActionData: link = "Characters/Zac/CAC/Zac_Base"
        IconCircle: option[string] = {
            "ASSETS/Characters/Zac/HUD/Zac_Circle.tex"
        }
        IconSquare: option[string] = {
            "ASSETS/Characters/Zac/HUD/Zac_Square.tex"
        }
        EmoteBuffbone: string = ""
        GodrayFxBone: string = ""
        HealthBarData: embed = CharacterHealthBarDataRecord {
            UnitHealthBarStyle: u8 = 12
        }
        mResourceResolver: link = "Characters/Zac/Skins/Skin0/Resources"
        PersistentEffectConditions: list2[pointer] = {
            PersistentEffectConditionData {
                OwnerCondition: pointer = IsAnimationPlayingDynamicMaterialBoolDriver {
                    mAnimationNames: list[hash] = {
                        "Spell4"
                        0x792ee8b0
                        0xda949924
                        0x4f25d6ab
                    }
                }
                PersistentVfxs: list2[embed] = {
                    PersistentVfxData {
                        BoneName: string = "L_ArmNoodle1"
                        EffectKey: hash = 0xa55ad994
                    }
                }
            }
            PersistentEffectConditionData {
                OwnerCondition: pointer = IsAnimationPlayingDynamicMaterialBoolDriver {
                    mAnimationNames: list[hash] = {
                        "Spell4_Windup"
                        "Spell4"
                        0x792ee8b0
                        0xda949924
                        0x4f25d6ab
                    }
                }
                PersistentVfxs: list2[embed] = {
                    PersistentVfxData {
                        BoneName: string = "L_ArmNoodle1"
                        EffectKey: hash = 0x7b3a4b5f
                    }
                }
            }
            PersistentEffectConditionData {
                OwnerCondition: pointer = IsAnimationPlayingDynamicMaterialBoolDriver {
                    mAnimationNames: list[hash] = {
                        "Spell1_Max"
                    }
                }
                PersistentVfxs: list2[embed] = {
                    PersistentVfxData {
                        BoneName: string = "L_ArmNoodle1"
                        EffectKey: hash = 0x750697cc
                    }
                }
            }
            PersistentEffectConditionData {
                OwnerCondition: pointer = IsAnimationPlayingDynamicMaterialBoolDriver {
                    mAnimationNames: list[hash] = {
                        "Spell1_Min"
                    }
                }
                PersistentVfxs: list2[embed] = {
                    PersistentVfxData {
                        BoneName: string = "L_ArmNoodle1"
                        EffectKey: hash = 0x9071bd64
                    }
                }
            }
        }
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.25
                    ReflectionOpacityGlancing: f32 = 0.100000001
                    ReflectionFresnel: f32 = 0.100000001
                    ReflectionFresnelColor: vec4 = { 1, 1, 1, 0.5 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 40, 40, 40 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.400000006 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 8
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.200000003
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.75
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.200000003
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.1999998
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 1
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 25, 100, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 25, 100, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.723999977, 0.683000028, 1 }
                            { 0.832000017, 0.822000027, 1 }
                            { 0.870000005, 0.907999992, 1 }
                            { 0.866999984, 0.957000017, 1 }
                            { 0.864000022, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    0.800000012
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 800, 2000, 800 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 800, 2000, 800 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 10, 2 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1200, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.899999976 }
                }
                Pass: i16 = 10
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 180, 180, 180 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 180, 180, 180 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 500, 500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 500, 500, 500 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 20, 20, 20 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
        }
        ParticleName: string = "Zac_Base_Q_tar"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar"
        SoundOnCreateDefault: string = "Play_sfx_Zac_ZacQHit_hit"
        Flags: u16 = 198
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Left" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Temp_Mesh"
                0x67425298: string = "L_ArmNoodle1"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveBeam {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_ArmYankLeft.anm"
                    }
                }
                BlendMode: u8 = 1
                Pass: i16 = 6
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                IsUniformScale: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.800000012, 0.800000012, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/zac_base_Q_stretchArm.tex"
            }
        }
        ParticleName: string = "Zac_Base_Q_Beam_Pull_Left"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Left"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Right" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Temp_Mesh"
                0x67425298: string = "L_ArmNoodle1"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveBeam {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_ArmYankRight.anm"
                    }
                }
                BlendMode: u8 = 1
                Pass: i16 = 6
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                IsUniformScale: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.800000012, 0.800000012, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/zac_base_Q_stretchArm.tex"
            }
        }
        ParticleName: string = "Zac_Base_Q_Beam_Pull_Right"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Right"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Moving" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Audio: pointer = VfxEmitterAudio {
                    SoundPersistent: string = "Play_sfx_Zac_ZacEMove_missilelaunch"
                }
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 100
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.5
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.5
                }
                Lifetime: option[f32] = {
                    2
                }
                EmitterLinger: option[f32] = {
                    0.699999988
                }
                EmitterName: string = "Spatter"
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 3, 3, 3 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1000, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1000, 0 }
                        }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 0.100000001
                }
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.150000006
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 20
                IsUniformScale: flag = true
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 1, 0, 0 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 30, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 30, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 60, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.75
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 60, 0, 0 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
        }
        ParticleName: string = "Zac_Base_E_Moving"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Moving"
        SoundOnCreateDefault: string = "Play_sfx_Zac_ZacEMove_buffactivate"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_tar" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.25
                    ReflectionOpacityGlancing: f32 = 0.100000001
                    ReflectionFresnel: f32 = 0.100000001
                    ReflectionFresnelColor: vec4 = { 1, 1, 1, 0.5 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 40, 40, 40 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.400000006 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 8
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.200000003
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.75
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.200000003
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.1999998
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 1
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 25, 100, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 25, 100, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.723999977, 0.683000028, 1 }
                            { 0.832000017, 0.822000027, 1 }
                            { 0.870000005, 0.907999992, 1 }
                            { 0.866999984, 0.957000017, 1 }
                            { 0.864000022, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
        }
        ParticleName: string = "Zac_Base_E_tar"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_tar"
        SoundOnCreateDefault: string = "Play_sfx_ZacGrumpy_ZacE_hitenemy"
        Flags: u16 = 198
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_cas" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring_01"
                Importance: u8 = 1
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                MiscRenderFlags: u8 = 1
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 140, 120, 120 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 140, 120, 120 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_02.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1.5 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.29999995
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 1.5 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring_02"
                Importance: u8 = 3
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/my_poca.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                MiscRenderFlags: u8 = 1
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 140, 120, 120 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 140, 120, 120 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1.5 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.29999995
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 1.5 }
                        }
                    }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.200000003 }
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 20
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.200000003
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.75
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.200000003
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.1999998
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 1
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 75, 200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 75, 200, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.723999977, 0.683000028, 1 }
                            { 0.832000017, 0.822000027, 1 }
                            { 0.870000005, 0.907999992, 1 }
                            { 0.866999984, 0.957000017, 1 }
                            { 0.864000022, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 800, 2000, 800 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 800, 2000, 800 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 10, 2 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1200, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.300007999 }
                }
                Pass: i16 = 10
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 180, 180, 180 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 180, 180, 180 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 500, 500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 500, 500, 500 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 20, 20, 20 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_Q_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice_Far"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 800, 1500, 800 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 800, 1500, 800 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 8, 2 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -900, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -900, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.300007999 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                IsDirectionOriented: flag = true
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 500, 500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 500, 500, 500 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 10, 10, 10 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_Q_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
        }
        SimpleEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 2
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.75
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.899999976
                                    1.10000002
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.75
                        }
                    }
                }
                Lifetime: option[f32] = {
                    0.100000001
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Shadow"
                Primitive: pointer = VfxPrimitivePlanarProjection {
                    mProjection: embed = VfxProjectionDefinitionData {
                        mYRange: f32 = 150
                        mFading: f32 = 100
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow_RGB.tex"
                BlendMode: u8 = 2
                MeshRenderFlags: u8 = 0
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow.tex"
                LegacySimple: pointer = VfxEmitterLegacySimple {
                    BirthScale: embed = ValueFloat {
                        ConstantValue: f32 = 250
                    }
                    Scale: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.208000004
                                0.382999986
                                0.637000024
                                0.833999991
                                0.908999979
                                1
                            }
                            Values: list[f32] = {
                                0.351000011
                                0.550000012
                                0.795000017
                                0.916000009
                                0.970000029
                                0.989000022
                                1
                            }
                        }
                    }
                    BirthRotation: embed = ValueFloat {
                        ConstantValue: f32 = 360
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        0
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[f32] = {
                                360
                            }
                        }
                    }
                    BirthRotationalVelocity: embed = ValueFloat {
                        ConstantValue: f32 = 75
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[f32] = {
                                75
                            }
                        }
                    }
                }
            }
        }
        ParticleName: string = "Zac_Base_W_cas"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_cas"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Disconnect" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Temp_Mesh"
                0x67425298: string = "L_ArmNoodle1"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveBeam {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_ArmDisconnect.anm"
                    }
                }
                BlendMode: u8 = 1
                Pass: i16 = 6
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                IsUniformScale: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.800000012, 0.800000012, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/zac_base_Q_stretchArm.tex"
            }
        }
        ParticleName: string = "Zac_Base_Q_Beam_Disconnect"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Disconnect"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Target1" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Temp_Mesh"
                0x67425298: string = "L_ArmNoodle1"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveBeam {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_Arm.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Q_ArmContact.anm"
                    }
                }
                BlendMode: u8 = 1
                Pass: i16 = 6
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                IsUniformScale: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.800000012, 0.800000012, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/zac_base_Q_stretchArm.tex"
            }
        }
        ParticleName: string = "Zac_Base_Q_Beam_Target1"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Target1"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_SmallerSlam" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[f32] = {
                            5
                            1.5
                        }
                    }
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 10
                ColorLookUpTypeX: u8 = 3
                ColorLookUpTypeY: u8 = 3
                AlphaRef: u8 = 10
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 135, 110, 110 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 135, 110, 110 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_02.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.29999995
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 100, 800, 100 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 100, 800, 100 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, 1, 1 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1000, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1000, 0 }
                        }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 0.800000012
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.899999976 }
                }
                Pass: i16 = 50
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 180, 180, 180 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 180, 180, 180 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 200, 200, 200 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 200, 200, 200 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            0.316000015
                            0.421999991
                            0.555999994
                            1
                        }
                        Values: list[vec3] = {
                            { 0.261000007, 0.236000001, 0.250999987 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.958000004, 0.785000026, 0.896000028 }
                            { 0.690999985, 0.713999987, 0.660000026 }
                            { 0.70599997, 0.633000016, 0.507000029 }
                            { 0.324000001, 0.425999999, 0.504999995 }
                            { 0, 0, 0 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1.5
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11.5
                }
                Lifetime: option[f32] = {
                    0.25
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring_2"
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, -20, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_E_LandSlime.scb"
                    }
                }
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.200000003 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 0.200000003 }
                            { 1, 1, 1, 0.200000003 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 2
                AlphaRef: u8 = 10
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 180, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 180, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 75, 75, 75 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.800000012 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 0.800000012 }
                        }
                    }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.0199999996 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            2
                        }
                    }
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Pool"
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 3, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-rampdown32_06.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                }
                Pass: i16 = -10
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 90, 0, 1 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 150, 150, 150 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0350000001
                            0.0500000007
                            0.0599999987
                            0.109999999
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 2.0999999, 2.0999999, 2.0999999 }
                            { 2.29999995, 2.29999995, 2.29999995 }
                            { 2.0999999, 2.20000005, 2.0999999 }
                            { 2, 2, 2 }
                            { 1.20000005, 1.20000005, 1.20000005 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E_Pool.tex"
                NumFrames: u16 = 3
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 11
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            2
                        }
                    }
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Spatter"
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 3, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 0.800000012 }
                            { 1, 1, 1, 0.800000012 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = -150
                ColorLookUpTypeX: u8 = 3
                ColorLookUpTypeY: u8 = 3
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 90, 0, 1 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 300, 100, 300 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.150000006
                            1
                        }
                        Values: list[vec3] = {
                            { 0.5, 0.5, 0.5 }
                            { 1.10000002, 1.10000002, 1.10000002 }
                            { 1.14999998, 1.14999998, 1.14999998 }
                            { 0.25, 1.14999998, 1.14999998 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice1"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 800, 2000, 800 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 800, 2000, 800 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 10, 2 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1200, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 200, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.300007999 }
                }
                Pass: i16 = 10
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 180, 180, 180 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 180, 180, 180 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 500, 500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 500, 500, 500 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 20, 20, 20 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_Q_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice_Far"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 800, 1500, 800 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 800, 1500, 800 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 8, 2 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -900, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -900, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 150, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.300007999 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                IsDirectionOriented: flag = true
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 500, 500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 500, 500, 500 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 10, 10, 10 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_Q_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 2
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.75
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.899999976
                                    1.10000002
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.75
                        }
                    }
                }
                Lifetime: option[f32] = {
                    0.100000001
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Shadow"
                Primitive: pointer = VfxPrimitivePlanarProjection {
                    mProjection: embed = VfxProjectionDefinitionData {
                        mYRange: f32 = 150
                        mFading: f32 = 100
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow_RGB.tex"
                BlendMode: u8 = 2
                MeshRenderFlags: u8 = 0
                ColorLookUpTypeY: u8 = 3
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 75, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 75, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 400, 400, 400 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                            0.208000004
                            0.382999986
                            0.637000024
                            0.833999991
                            0.908999979
                            1
                        }
                        Values: list[vec3] = {
                            { 0.351000011, 0.351000011, 0.351000011 }
                            { 0.550000012, 0.550000012, 0.550000012 }
                            { 0.795000017, 0.795000017, 0.795000017 }
                            { 0.916000009, 0.916000009, 0.916000009 }
                            { 0.970000029, 0.970000029, 0.970000029 }
                            { 0.989000022, 0.989000022, 0.989000022 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow.tex"
            }
        }
        ParticleName: string = "Zac_Base_R_SmallerSlam"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_SmallerSlam"
        SoundOnCreateDefault: string = "Play_sfx_Zac_ZacR_hit_smallerslam"
        VoiceOverOnCreateDefault: string = "Play_vo_Zac_ZacR_buffactivate"
        SoundPersistentDefault: string = "Play_sfx_Zac_ZacR_hit_splat"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_tar" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.25
                    ReflectionOpacityGlancing: f32 = 0.100000001
                    ReflectionFresnel: f32 = 0.100000001
                    ReflectionFresnelColor: vec4 = { 1, 1, 1, 0.5 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 40, 40, 40 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.400000006 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 8
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.200000003
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.75
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.200000003
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.1999998
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 1
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 25, 100, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 25, 100, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.723999977, 0.683000028, 1 }
                            { 0.832000017, 0.822000027, 1 }
                            { 0.870000005, 0.907999992, 1 }
                            { 0.866999984, 0.957000017, 1 }
                            { 0.864000022, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
        }
        ParticleName: string = "Zac_Base_R_tar"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_tar"
        Flags: u16 = 198
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_tar" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Ult_Slam_Cyl.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.25
                    ReflectionOpacityGlancing: f32 = 0.100000001
                    ReflectionFresnel: f32 = 0.100000001
                    ReflectionFresnelColor: vec4 = { 1, 1, 1, 0.5 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 40, 40, 40 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.400000006 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 8
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.200000003
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.75
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.200000003
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.1999998
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 160, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00549999997
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 1
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 25, 100, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 25, 100, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.723999977, 0.683000028, 1 }
                            { 0.832000017, 0.822000027, 1 }
                            { 0.870000005, 0.907999992, 1 }
                            { 0.866999984, 0.957000017, 1 }
                            { 0.864000022, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
        }
        ParticleName: string = "Zac_Base_W_tar"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_tar"
        SoundOnCreateDefault: string = "Play_sfx_ZacGrumpy_ZacW_hit"
        Flags: u16 = 198
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Chunk_SelfHighlight" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.800000012
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 8
                }
                ParticleLinger: option[f32] = {
                    18
                }
                Lifetime: option[f32] = {
                    1.10000002
                }
                IsSingleParticle: flag = true
                EmitterName: string = "base"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 10, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = -10
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 0 }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 40, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 110, 110, 110 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Blob_Health.tex"
            }
        }
        ParticleName: string = "Zac_Base_P_Chunk_SelfHighlight"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Chunk_SelfHighlight"
    }
    "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_LandSplash" = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.699999988
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.699999988
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6999998
                }
                Lifetime: option[f32] = {
                    0.25
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring"
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_E_LandSlime.scb"
                    }
                }
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0.5 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 2
                AlphaRef: u8 = 10
                DisableBackfaceCull: bool = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 30, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 30, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 100, 100, 100 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1.5 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 1.5 }
                        }
                    }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.0199999996 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    2
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Juice"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 150, 1500 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.25
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 150, 1500 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    0
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 1, 1, 1 }
                        }
                    }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -1000, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -1000, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    EmitOffset: embed = ValueVector3 {
                        ConstantValue: vec3 = { 40, 0, 80 }
                        Dynamics: pointer = VfxAnimatedVector3fVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {}
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                    }
                                    KeyValues: list[f32] = {
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[vec3] = {
                                { 40, 0, 80 }
                            }
                        }
                    }
                    EmitRotationAngles: list[embed] = {
                        ValueFloat {
                            ConstantValue: f32 = 35
                            Dynamics: pointer = VfxAnimatedFloatVariableData {
                                ProbabilityTables: list[pointer] = {
                                    VfxProbabilityTableData {
                                        KeyTimes: list[f32] = {
                                            0
                                            1
                                        }
                                        KeyValues: list[f32] = {
                                            -1
                                            1
                                        }
                                    }
                                }
                                Times: list[f32] = {
                                    0
                                }
                                Values: list[f32] = {
                                    35
                                }
                            }
                        }
                    }
                    EmitRotationAxes: list[vec3] = {
                        { 0, 1.00000012, 0 }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Sphere.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.899999976 }
                }
                Pass: i16 = 20
                AlphaRef: u8 = 30
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 360, 360 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 360, 360, 360 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 400, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 400, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 40, 40, 40 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.105999999
                            0.200000003
                            0.316000015
                            0.421999991
                            0.555999994
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.763000011, 0.34799999, 0.546000004 }
                            { 0.99000001, 0.785000026, 0.896000028 }
                            { 0.963999987, 0.796000004, 0.739000022 }
                            { 0.80400002, 0.694999993, 0.597000003 }
                            { 0.386999995, 0.50999999, 0.602999985 }
                            { 0, 0, 0 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_Color.tex"
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 1, 1 }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.5
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Splat"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 0, 250 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 0, 250 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 2
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 80, 0, 90 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.400000006
                                    1.79999995
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 80, 0, 90 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 300, 75, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 300, 75, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.510999978
                            0.703000009
                            1
                        }
                        Values: list[vec3] = {
                            { 0.25, 0.0850000009, 1 }
                            { 0.800000012, 0.683000028, 1 }
                            { 0.879999995, 0.822000027, 1 }
                            { 0.884000003, 0.907999992, 1 }
                            { 0.884000003, 0.957000017, 1 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 16
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Audio: pointer = VfxEmitterAudio {
                    SoundOnCreate: string = "Play_sfx_Zac_ZacE_hit"
                }
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            2
                        }
                    }
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Pool"
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 3, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-rampdown32_06.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.5 }
                }
                Pass: i16 = 10
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 90, 0, 1 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 150, 150, 150 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0350000001
                            0.0500000007
                            0.0599999987
                            0.109999999
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 2.0999999, 2.0999999, 2.0999999 }
                            { 2.29999995, 2.29999995, 2.29999995 }
                            { 2.0999999, 2.20000005, 2.0999999 }
                            { 2, 2, 2 }
                            { 1.20000005, 1.20000005, 1.20000005 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E_Pool.tex"
                NumFrames: u16 = 3
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 11
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.5
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            2
                        }
                    }
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Spatter"
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 3, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.25
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.800000012 }
                            { 1, 1, 1, 0.800000012 }
                            { 1, 1, 1, 0.800000012 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = -150
                ColorLookUpTypeX: u8 = 3
                ColorLookUpTypeY: u8 = 3
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 90, 0, 1 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 300, 100, 300 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0299999993
                            0.0599999987
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1.5, 1.14999998, 1.14999998 }
                            { 1.25, 1.14999998, 1.14999998 }
                            { 0.25, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.300000012
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.5
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.5
                }
                Lifetime: option[f32] = {
                    0.200000003
                }
                IsSingleParticle: flag = true
                EmitterLinger: option[f32] = {
                    0.699999988
                }
                EmitterName: string = "Juice2"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1500, 300, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    4
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 1500, 300, 0 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 3, 3, 3 }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    EmitRotationAngles: list[embed] = {
                        ValueFloat {
                            ConstantValue: f32 = -90
                            Dynamics: pointer = VfxAnimatedFloatVariableData {
                                ProbabilityTables: list[pointer] = {
                                    VfxProbabilityTableData {
                                        KeyTimes: list[f32] = {
                                            0
                                            1
                                        }
                                        KeyValues: list[f32] = {
                                            0.75
                                            1.25
                                        }
                                    }
                                }
                                Times: list[f32] = {
                                    0
                                }
                                Values: list[f32] = {
                                    -90
                                }
                            }
                        }
                    }
                    EmitRotationAxes: list[vec3] = {
                        { 0, 1.00000012, 0 }
                    }
                }
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 20
                IsUniformScale: flag = true
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 1, 0, 0 }
                        }
                    }
                }
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 30, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 30, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 20, 20, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 20, 20, 20 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec3] = {
                            { 1, 1, 1 }
                            { 3, 5, 5 }
                            { 6, 3, 6 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_03.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
        }
        SimpleEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 2
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.75
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.899999976
                                    1.10000002
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.75
                        }
                    }
                }
                Lifetime: option[f32] = {
                    0.100000001
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Shadow"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 0, 350 }
                }
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 0, 100 }
                }
                Primitive: pointer = VfxPrimitivePlanarProjection {
                    mProjection: embed = VfxProjectionDefinitionData {
                        mYRange: f32 = 150
                        mFading: f32 = 100
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow_RGB.tex"
                BlendMode: u8 = 2
                MeshRenderFlags: u8 = 0
                ColorLookUpTypeY: u8 = 3
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Shadow.tex"
                LegacySimple: pointer = VfxEmitterLegacySimple {
                    BirthScale: embed = ValueFloat {
                        ConstantValue: f32 = 300
                    }
                    Scale: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0.351000011
                                1
                            }
                        }
                    }
                    BirthRotation: embed = ValueFloat {
                        ConstantValue: f32 = 360
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        0
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[f32] = {
                                360
                            }
                        }
                    }
                    BirthRotationalVelocity: embed = ValueFloat {
                        ConstantValue: f32 = 75
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[f32] = {
                                75
                            }
                        }
                    }
                }
            }
        }
        ParticleName: string = "Zac_Base_E_LandSplash"
        ParticlePath: string = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_LandSplash"
    }
    0x1c1ea8de = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Puddle_Mesh"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xa8f0b7bd
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Mouth"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xf354baf0
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                Pass: i16 = 7
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle.tex"
            }
        }
        VisibilityRadius: f32 = 25000
        ParticleName: string = "my_ut_Zac_Base_R_Puddle"
        ParticlePath: string = "my_ut_Zac_Base_R_Puddle"
        Flags: u16 = 198
    }
    0xa55ad994 = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Puddle_Mesh"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xa8f0b7bd
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Bubble.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Mouth"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Bubble.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xf354baf0
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                Pass: i16 = 7
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Bubble.tex"
            }
        }
        VisibilityRadius: f32 = 25000
        ParticleName: string = "my_ut_Zac_Base_R_Bubble"
        ParticlePath: string = "my_ut_Zac_Base_R_Bubble"
        Flags: u16 = 198
    }
    0xffbf2a72 = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Puddle_Mesh"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretche.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretch.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretch.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xa8f0b7bd
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Armstretch.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Mouth"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretch.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretch.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Armstretch.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xf354baf0
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                Pass: i16 = 7
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Armstretch.tex"
            }
        }
        VisibilityRadius: f32 = 25000
        ParticleName: string = "my_ut_Zac_Base_Q_Armstretch"
        ParticlePath: string = "my_ut_Zac_Base_Q_Armstretch"
        Flags: u16 = 198
    }
    0x750697cc = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Puddle_Mesh"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xa8f0b7bd
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle_vermelha.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Mouth"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xf354baf0
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                Pass: i16 = 7
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle_vermelha.tex"
            }
        }
        VisibilityRadius: f32 = 25000
        ParticleName: string = "my_ut_vermelha"
        ParticlePath: string = "my_ut_vermelha"
        Flags: u16 = 198
    }
    0x9071bd64 = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Puddle_Mesh"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xa8f0b7bd
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Swain_Skin03_CubeMap.dds"
                    ReflectionOpacityDirect: f32 = 0.5
                    ReflectionOpacityGlancing: f32 = 0.400000006
                    ReflectionFresnel: f32 = 0.600000024
                    ReflectionFresnelColor: vec4 = { 0.600000024, 0.600000024, 0.600000024, 1 }
                    Fresnel: f32 = 0.219999999
                    FresnelColor: vec4 = { 0.101961002, 0.301961005, 0.0784310028, 1 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle_azul.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = -1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Mouth"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skn"
                        mMeshSkeletonName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.skl"
                        mAnimationName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Base_R_Puddle.anm"
                        mSubmeshesToDraw: list[hash] = {
                            0xf354baf0
                        }
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000072 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.800000012 }
                }
                Pass: i16 = 7
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_base_R_Puddle_azul.tex"
            }
        }
        VisibilityRadius: f32 = 25000
        ParticleName: string = "my_ut_azul"
        ParticlePath: string = "my_ut_azul"
        Flags: u16 = 198
    }
    0x04ff5c13 = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "censored_red"
                Importance: u8 = 3
                Filtering: pointer = VfxEmitterFiltering {
                    CensorPolicy: u8 = 2
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-bloodpool-proj.tex"
                BlendMode: u8 = 1
                Pass: i16 = -2
                CensorModulateValue: vec4 = { 0, 0, 0, 1 }
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { -90, 0, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 350, 1, 1 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.800000012
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 1, 1, 1 }
                            { 0, 0, 0 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_SanguinePoolProj.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 30
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[f32] = {
                            42
                            30
                        }
                    }
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[f32] = {
                            2.5
                            2
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    0.5
                }
                EmitterName: string = "ringsproj"
                Importance: u8 = 1
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 10, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-bloodring32.tex"
                BlendMode: u8 = 1
                Pass: i16 = -1
                ColorLookUpTypeY: u8 = 3
                CensorModulateValue: vec4 = { 0, 0, 0, 0.25 }
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { -90, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { -90, 1, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 170, 170, 1 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[vec3] = {
                            { 170, 170, 1 }
                            { 34, 34, 0.200000003 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.200000003
                            0.300000012
                            0.699999988
                            0.850000024
                            1
                        }
                        Values: list[vec3] = {
                            { 0.5, 0.5, 0.5 }
                            { 1, 1, 1 }
                            { 1.79999995, 1.79999995, 1.79999995 }
                            { 1.89999998, 1.89999998, 1.89999998 }
                            { 2.0999999, 2.0999999, 2.0999999 }
                            { 2.20000005, 2.20000005, 2.20000005 }
                            { 0.200000003, 0.200000003, 0.200000003 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/bloodring.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "redproj"
                Importance: u8 = 3
                Filtering: pointer = VfxEmitterFiltering {
                    CensorPolicy: u8 = 1
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitivePlanarProjection {
                    mProjection: embed = VfxProjectionDefinitionData {
                        mYRange: f32 = 200
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-bloodpool-proj.tex"
                BlendMode: u8 = 1
                Pass: i16 = -2
                MeshRenderFlags: u8 = 0
                CensorModulateValue: vec4 = { 0, 0, 0, 1 }
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { -90, 0, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 350, 350, 350 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.800000012
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 1, 1, 1 }
                            { 0, 0, 0 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_SanguinePoolProj.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 30
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[f32] = {
                            42
                            30
                        }
                    }
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[f32] = {
                            2.5
                            2
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    0.5
                }
                EmitterName: string = "rings"
                Importance: u8 = 4
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                SpawnShape: pointer = 0xee39916f {
                    EmitOffset: vec3 = { 0, 10, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-bloodring32.tex"
                BlendMode: u8 = 1
                Pass: i16 = -1
                MeshRenderFlags: u8 = 0
                ColorLookUpTypeY: u8 = 3
                CensorModulateValue: vec4 = { 0, 0, 0, 1 }
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { -90, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { -90, 1, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 170, 170, 170 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[vec3] = {
                            { 170, 170, 170 }
                            { 34, 34, 34 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.200000003
                            0.300000012
                            0.699999988
                            0.850000024
                            1
                        }
                        Values: list[vec3] = {
                            { 0.5, 0.5, 0.5 }
                            { 1, 1, 1 }
                            { 1.79999995, 1.79999995, 1.79999995 }
                            { 1.89999998, 1.89999998, 1.89999998 }
                            { 2.0999999, 2.0999999, 2.0999999 }
                            { 2.20000005, 2.20000005, 2.20000005 }
                            { 0.200000003, 0.200000003, 0.200000003 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/bloodring.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                EmitterName: string = "distortion"
                Importance: u8 = 1
                Filtering: pointer = VfxEmitterFiltering {
                    CensorPolicy: u8 = 1
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-distortbloodbell.tex"
                BlendMode: u8 = 1
                Pass: i16 = 1
                MeshRenderFlags: u8 = 0
                DistortionDefinition: pointer = VfxDistortionDefinitionData {
                    Distortion: f32 = 0.00249999994
                    NormalMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_distort-twirl.tex"
                }
                IsUniformScale: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { -90, -90, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 190, 190, 190 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.200000003
                            0.300000012
                            0.699999988
                            0.850000024
                            1
                        }
                        Values: list[vec3] = {
                            { 0.5, 0.5, 0.5 }
                            { 1, 1, 1 }
                            { 1.79999995, 1.79999995, 1.79999995 }
                            { 1.89999998, 1.89999998, 1.89999998 }
                            { 2.0999999, 2.0999999, 2.0999999 }
                            { 2.20000005, 2.20000005, 2.20000005 }
                            { 0.200000003, 0.200000003, 0.200000003 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/common_color-hold.tex"
            }
        }
        ParticleName: string = "Vladimir_Base_W_buf_ut"
        ParticlePath: string = "Vladimir_Base_W_buf_ut"
    }
    0x7b3a4b5f = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    0.150000006
                }
                IsSingleParticle: flag = true
                EmitterName: string = "UnderGlow"
                Filtering: pointer = VfxEmitterFiltering {
                    KeywordsExcluded: list[string] = {
                        "ZacGrumpy"
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 25, 0 }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.689997733 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 0, 0, 0, 1 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.25
                            0.899999976
                            1
                        }
                        Values: list[vec4] = {
                            { 0, 0, 0, 0 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 0 }
                        }
                    }
                }
                Pass: i16 = -100
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 90, 0, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 430, 430, 430 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.899999976
                            1
                        }
                        Values: list[vec3] = {
                            { 0.400000006, 0.400000006, 4 }
                            { 0.970000029, 0.970000029, 0.970000029 }
                            { 1, 1, 1 }
                            { 0.400000006, 0.400000006, 0.400000006 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_Buff_Glow.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    0.800000012
                }
                Lifetime: option[f32] = {
                    1.5
                }
                EmitterLinger: option[f32] = {
                    0.5
                }
                EmitterName: string = "healwave"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 15, 0, 0 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, 100, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 100, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeCylinder {
                    Flags: u8 = 1
                    Radius: f32 = 250
                    Height: f32 = 60
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -25, 0 }
                }
                FlexShapeDefinition: pointer = VfxFlexShapeDefinitionData {
                    ScaleBirthScaleByBoundObjectSize: f32 = 0.00499999989
                    ScaleEmitOffsetByBoundObjectSize: f32 = 0.00499999989
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/DefaultFalloff.tex"
                BlendMode: u8 = 4
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.190005347 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.25
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0.190005347 }
                            { 1, 1, 1, 0.190005347 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 50
                MiscRenderFlags: u8 = 1
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 0, 90 }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 70, -45, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.699999988
                                    1.25
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    0.5
                                    0.50999999
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -2
                                    -1
                                    1
                                    2
                                }
                            }
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    0
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 70, -45, 20 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 1, 1 }
                            { 8, 0.850000024, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Sion_Skin05_W_Wisps.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.25
                }
                Lifetime: option[f32] = {
                    2
                }
                IsSingleParticle: flag = true
                EmitterName: string = "cracks"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 25, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_FlatPlane.scb"
                    }
                }
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 0, 0, 0, 1 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.899999976
                            1
                        }
                        Values: list[vec4] = {
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 0 }
                        }
                    }
                }
                Pass: i16 = -84
                MeshRenderFlags: u8 = 0
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.25
                            }
                            Values: list[f32] = {
                                1
                                0
                            }
                        }
                    }
                    ErosionFeatherIn: f32 = 0.200000003
                    ErosionFeatherOut: f32 = 0.200000003
                    ErosionMapName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_MagicCircle03.tex"
                    ErosionMapChannelMixer: embed = ValueColor {
                        ConstantValue: vec4 = { 1, 0, 0, 0 }
                    }
                }
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2.75, 600, 600 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_E_FlameMovement.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.0500000007 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_MagicCircle04.tex"
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 4
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        Times: list[f32] = {
                            0
                            0.25
                            1
                        }
                        Values: list[f32] = {
                            2
                            4
                            8
                        }
                    }
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2
                }
                Lifetime: option[f32] = {
                    2
                }
                EmitterName: string = "mesh_ground"
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 1, 0 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 0, -500, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -500, 0 }
                        }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 300, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_weaponswipe.scb"
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.280003041 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.300000012
                            0.400000006
                            0.600000024
                            1
                        }
                        Values: list[vec4] = {
                            { 0, 0, 0, 0 }
                            { 0, 0, 0, 0.43921569 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 0.790005326 }
                            { 0, 0, 0, 0 }
                        }
                    }
                }
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0
                                1
                            }
                        }
                    }
                    ErosionFeatherIn: f32 = 0.5
                    ErosionFeatherOut: f32 = 0.5
                    ErosionSliceWidth: f32 = 1
                    ErosionMapName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_mult.tex"
                }
                DisableBackfaceCull: bool = true
                MiscRenderFlags: u8 = 1
                IsGroundLayer: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    360
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 1, 0 }
                        }
                    }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, -3, 1 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.349999994
                            1
                        }
                        Values: list[vec3] = {
                            { 1.60000002, 1.60000002, 1.60000002 }
                            { 1, 1.60000002, 1 }
                            { 0.200000003, 1.60000002, 0.200000003 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_Wisp.tex"
                TexAddressModeBase: u8 = 2
                ParticleUvScrollRate: embed = IntegratedValueVector2 {
                    ConstantValue: vec2 = { -1.5, 0 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        Times: list[f32] = {
                            0
                            1
                        }
                        Values: list[vec2] = {
                            { 0, 0 }
                            { -3, 0 }
                        }
                    }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 1.5 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    0.5
                                    0.50999999
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1
                                    -1
                                    -1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0.5
                            1
                        }
                        Values: list[vec2] = {
                            { 1, 1.5 }
                            { 0.5, 6 }
                        }
                    }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/Zac/Skins/base/Particles/Aura_Self.tex"
                    ParticleIntegratedUvScrollMult: embed = IntegratedValueVector2 {
                        ConstantValue: vec2 = { -0.100000001, 0 }
                        Dynamics: pointer = VfxAnimatedVector2fVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[vec2] = {
                                { 0, 0 }
                                { -0.100000001, 0 }
                            }
                        }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 120
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.400000006
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    2
                }
                EmitterName: string = "SmokeOutBlack1"
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1400, 0, 0 }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 5, 5, 5 }
                }
                BirthAcceleration: embed = ValueVector3 {
                    ConstantValue: vec3 = { 500, 0, 0 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                        }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    EmitOffset: embed = ValueVector3 {
                        ConstantValue: vec3 = { 1, 0, 0 }
                    }
                    EmitRotationAngles: list[embed] = {
                        ValueFloat {
                            ConstantValue: f32 = 1
                            Dynamics: pointer = VfxAnimatedFloatVariableData {
                                ProbabilityTables: list[pointer] = {
                                    VfxProbabilityTableData {
                                        KeyTimes: list[f32] = {
                                            0
                                            1
                                        }
                                        KeyValues: list[f32] = {
                                            0
                                            360
                                        }
                                    }
                                }
                                Times: list[f32] = {
                                    0
                                }
                                Values: list[f32] = {
                                    1
                                }
                            }
                        }
                    }
                    EmitRotationAxes: list[vec3] = {
                        { 0, 1.00000012, 0 }
                    }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 0, 0, 0, 0.509803951 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.300000012
                            1
                        }
                        Values: list[vec4] = {
                            { 0, 0, 0, 0 }
                            { 0, 0, 0, 0.509803951 }
                            { 0, 0, 0, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0
                                0.699999988
                            }
                        }
                    }
                    ErosionFeatherOut: f32 = 0.200000003
                    ErosionMapName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_SmokeErosion.tex"
                    ErosionMapChannelMixer: embed = ValueColor {
                        ConstantValue: vec4 = { 1, 0, 0, 0 }
                    }
                }
                IsDirectionOriented: flag = true
                IsRandomStartFrame: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 90, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 200, 400, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.5
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 200, 400, 0 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.25, 0.25, 0.25 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_WispySmoke01.tex"
                NumFrames: u16 = 4
                TexDiv: vec2 = { 2, 2 }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.100000001
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 2.5
                }
                ParticleLinger: option[f32] = {
                    0.25
                }
                Lifetime: option[f32] = {
                    2
                }
                IsSingleParticle: flag = true
                EmitterName: string = "cracks4"
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                EmitterPosition: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 25, 0 }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_FlatPlane.scb"
                    }
                }
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.39000535 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 0, 0, 0, 1 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.200000003
                            0.899999976
                            1
                        }
                        Values: list[vec4] = {
                            { 0, 0, 0, 0 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 1 }
                            { 0, 0, 0, 0 }
                        }
                    }
                }
                Pass: i16 = -83
                MeshRenderFlags: u8 = 0
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2.25, 600, 600 }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_E_SmokeErode.tex"
                UvMode: u8 = 1
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.150000006 }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 2, 1 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/Zac/Skins/base/Particles/Vladimir_Skin14_W_MagicCircle04.tex"
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.200000003
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 3
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.600000024
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.600000024
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    10.6000004
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "my_poca"
                Importance: u8 = 3
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -200, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, -200, 0 }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/Zac/Skins/Base/Particles/my_poca.scb"
                    }
                }
                ParticleColorTexture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_RGB.tex"
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = 5
                ReflectionDefinition: pointer = VfxReflectionDefinitionData {
                    ReflectionMapTexture: string = "ASSETS/Characters/Zac/Skins/Base/particles/Samira_CubeMap.dds"
                    ReflectionFresnel: f32 = 0.219999999
                    ReflectionFresnelColor: vec4 = { 0.100000001, 0.300000012, 0.0799999982, 1 }
                }
                MiscRenderFlags: u8 = 1
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 360, 20 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 360, 20 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 140, 120, 120 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.600000024
                                    1.20000005
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 140, 120, 120 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/Zac/Skins/Base/Particles/Zac_Goo_E.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 1.5 }
                    Dynamics: pointer = VfxAnimatedVector2fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    1
                                    1.29999995
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec2] = {
                            { 0, 1.5 }
                        }
                    }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, 0.200000003 }
                }
            }
        }
        ParticleName: string = "my_Sybionte_ut_lama"
        ParticlePath: string = "my_Sybionte_ut_lama"
        Transform: mtx44 = {
            1, 0, 0, 0
            0, 1, 0, 0
            0, 0, 1, 0
            0, 0, 0, 1
        }
    }
    0xa2fa6a01 = VfxSystemDefinitionData {
        ComplexEmitterDefinitionData: list[pointer] = {
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.100000001
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    1
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Dark Under Glow"
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 1
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.0199999996
                            0.0399999991
                            0.899999976
                            1
                        }
                        Values: list[vec4] = {
                            { 0.384313732, 0.0274509806, 1, 0 }
                            { 0.592156887, 0.0274509806, 0.643137276, 1 }
                            { 0.129411772, 0.0117647061, 0.294117659, 1 }
                            { 0.0627451017, 0.00392156886, 0.219607845, 1 }
                            { 0.0235294122, 0, 0.0627451017, 0 }
                        }
                    }
                }
                Pass: i16 = -1910
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 1, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                }
                                KeyValues: list[f32] = {
                                    90
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 1, 1, 0 }
                        }
                    }
                }
                IsLocalOrientation: flag = false
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 350, 150, 50 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0399999991
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_E_BackDrop.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Additive Flame Wave"
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_W_Circle_Mesh.scb"
                    }
                }
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.489997715, 0, 0.829999208, 0.330006868 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.0500000007
                            0.100000001
                            0.949999988
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 0.219607845, 0.964705884, 1, 1 }
                            { 0.627451003, 0.0274509806, 1, 1 }
                            { 0.145098045, 0.0156862754, 0.274509817, 1 }
                            { 0.137254909, 0.00392156886, 0.274509817, 0 }
                        }
                    }
                }
                Pass: i16 = -1700
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2.70000005, 5, 3.25 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0683544278
                            0.136708856
                            0.170506328
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.934761465, 0.934761465, 0.142372876 }
                            { 0.978415489, 0.978415489, 0.305084735 }
                            { 1, 1, 0.806779683 }
                            { 1.20000005, 0, 1.20000005 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_Fire_Trail_Up.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { -0.100000001, -0.699999988 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.100000001 }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 2, 1 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morg_Base_BA_MeshMult.tex"
                    TexAddressModeMult: u8 = 2
                    BirthUvoffsetMult: embed = ValueVector2 {
                        ConstantValue: vec2 = { 0, -0.200000003 }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "alpha Flame Wave"
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_W_Circle_Mesh.scb"
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.0666666701, 0, 0.145098045, 0.690196097 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.949999988
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 0.0823529437, 0.0823529437, 0.0823529437, 0 }
                        }
                    }
                }
                Pass: i16 = -1800
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 3, 5, 3 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0683544278
                            0.136708856
                            0.170506328
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 0.934761465, 0.934761465, 0.142372876 }
                            { 0.978415489, 0.978415489, 0.305084735 }
                            { 1, 1, 0.806779683 }
                            { 1.20000005, 0, 1.20000005 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_Fire_Trail_Up.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.300000012 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.100000001 }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 3, 1 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morg_Base_BA_MeshMult.tex"
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Small Ripples"
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_W_Mist_Mesh.scb"
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.0899977088, 0, 0.160006106, 0.349996179 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.800000012
                            1
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 0 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 0 }
                        }
                    }
                }
                Pass: i16 = -1800
                MiscRenderFlags: u8 = 1
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthRotationalVelocity0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, -30, 0 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 2, 100, 2 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.00999999978
                            0.0199999996
                            0.170506328
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1.20000005, 2, 1.20000005 }
                            { 0.935000002, 0, 0.935000002 }
                            { 1.20000005, 0, 1.20000005 }
                            { 1.20000005, 0, 1.20000005 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_Fire_Trail_Up.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -1.5 }
                }
                BirthUvoffset: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0, -0.100000001 }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 1, 2 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_FunnelMult.tex"
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.0500000007
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLingerType: u8 = 1
                ParticleLinger: option[f32] = {
                    0.25
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring Alpha Fill"
                Importance: u8 = 3
                Filtering: pointer = VfxEmitterFiltering {
                    SpectatorPolicy: u8 = 1
                }
                Linger: pointer = VfxLingerDefinitionData {
                    UseSeparateLingerColor: flag = true
                    SeparateLingerColor: embed = ValueColor {
                        ConstantValue: vec4 = { 0.572549045, 0.0509803928, 0.968627453, 1 }
                        Dynamics: pointer = VfxAnimatedColorVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[vec4] = {
                                { 0.572549045, 0.0509803928, 0.968627453, 1 }
                                { 0.0228984654, 0, 0.106551237, 0 }
                            }
                        }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_indicator_ring.scb"
                    }
                }
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.0800030529 }
                }
                Color: embed = ValueColor {
                    ConstantValue: vec4 = { 0.0431372561, 0.0313725509, 0.301960796, 1 }
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.0599999987
                            0.899999976
                            0.999899983
                        }
                        Values: list[vec4] = {
                            { 0.0431372561, 0.0313725509, 0.301960796, 0 }
                            { 0.0431372561, 0.0313725509, 0.301960796, 1 }
                            { 0.0431372561, 0.0313725509, 0.301960796, 1 }
                            { 0.0431372561, 0.0313725509, 0.301960796, 1 }
                        }
                    }
                }
                Pass: i16 = -10
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.0500000007
                            }
                            Values: list[f32] = {
                                2
                                0
                            }
                        }
                    }
                    UseLingerErosionDriveCurve: bool = true
                    LingerErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0
                                1
                            }
                        }
                    }
                    ErosionMapName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_E_Smoke_Erode.tex"
                }
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.569999993, 0.569999993, 0.569999993 }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.0299999993
                            1
                        }
                        Values: list[vec3] = {
                            { 1.5, 1.10000002, 2 }
                            { 1, 1, 1 }
                            { 1, 1, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morg_Base_BA_MeshMult.tex"
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 8, 1 }
                }
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.0500000007
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Additive Ring"
                Importance: u8 = 3
                Filtering: pointer = VfxEmitterFiltering {
                    SpectatorPolicy: u8 = 1
                }
                Linger: pointer = VfxLingerDefinitionData {
                    UseSeparateLingerColor: flag = true
                    SeparateLingerColor: embed = ValueColor {
                        ConstantValue: vec4 = { 0.313725501, 0.0196078438, 0.725490212, 1 }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_indicator_ring.scb"
                    }
                }
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.930006862, 0.549996197, 1, 0.570000768 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.0599999987
                            0.980000019
                            1
                        }
                        Values: list[vec4] = {
                            { 0.820004582, 0.059998475, 1, 0 }
                            { 0.819607854, 0.0588235296, 1, 1 }
                            { 0.349019617, 0.0980392173, 0.454901963, 1 }
                            { 0.220004573, 0.00999465957, 0.349996179, 0 }
                        }
                    }
                }
                Pass: i16 = 90
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.0500000007
                            }
                            Values: list[f32] = {
                                0
                                0
                            }
                        }
                    }
                    LingerErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0
                                1
                            }
                        }
                    }
                    ErosionMapName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_E_Smoke_Erode.tex"
                }
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.569999993, 0.569999993, 0.569999993 }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Edge.tex"
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 8, 1 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_Q_Mis_Energy.tex"
                    UvScaleMult: embed = ValueVector2 {
                        ConstantValue: vec2 = { 3, 1 }
                    }
                    BirthUvScrollRateMult: embed = ValueVector2 {
                        ConstantValue: vec2 = { 0.200000003, 0 }
                    }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 15
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 0.5
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            0.5
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    5
                }
                EmitterName: string = "Embers1"
                BirthOrbitalVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 1, 0 }
                        }
                    }
                }
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 700, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.300000012
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 700, 0 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 4, 0 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 900, 25, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.25
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 900, 25, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    EmitOffset: embed = ValueVector3 {
                        ConstantValue: vec3 = { 200, 0, 200 }
                        Dynamics: pointer = VfxAnimatedVector3fVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {}
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[vec3] = {
                                { 200, 0, 200 }
                            }
                        }
                    }
                }
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.839993894 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 0.192156866, 0.164705887, 1, 0 }
                            { 1, 0.172549024, 0.933333337, 1 }
                            { 0.0588235296, 0.00392156886, 0.101960786, 0 }
                        }
                    }
                }
                IsDirectionOriented: flag = true
                DirectionVelocityScale: f32 = 0.00400000019
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 10, 10, 50 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 10, 10, 50 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 1, 0, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_EnergyBits.tex"
            }
            VfxEmitterDefinitionData {
                TimeBeforeFirstEmission: f32 = 0.0500000007
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                ParticleLinger: option[f32] = {
                    0.5
                }
                Lifetime: option[f32] = {
                    1
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ring Blur"
                Importance: u8 = 3
                Filtering: pointer = VfxEmitterFiltering {
                    SpectatorPolicy: u8 = 1
                }
                Linger: pointer = VfxLingerDefinitionData {
                    UseSeparateLingerColor: flag = true
                    SeparateLingerColor: embed = ValueColor {
                        ConstantValue: vec4 = { 0.313725501, 0.0196078438, 0.725490212, 1 }
                    }
                }
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                Primitive: pointer = VfxPrimitiveMesh {
                    mMesh: embed = VfxMeshDefinitionData {
                        mSimpleMeshName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_R_indicator_ring.scb"
                    }
                }
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.435294122, 0.149019614, 0.549019635, 0.349019617 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.0599999987
                            0.980000019
                            1
                        }
                        Values: list[vec4] = {
                            { 0.820004582, 0.059998475, 1, 0 }
                            { 0.819607854, 0.0588235296, 1, 1 }
                            { 0.474509805, 0.13333334, 0.619607866, 1 }
                            { 0.220004573, 0.00999465957, 0.349996179, 0 }
                        }
                    }
                }
                Pass: i16 = 80
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.0500000007
                            }
                            Values: list[f32] = {
                                0
                                0
                            }
                        }
                    }
                    LingerErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                1
                            }
                            Values: list[f32] = {
                                0
                                1
                            }
                        }
                    }
                    ErosionMapName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_E_Smoke_Erode.tex"
                }
                MiscRenderFlags: u8 = 1
                IsUniformScale: flag = true
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0.569999993, 0.569999993, 0.569999993 }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Edge_Blur.tex"
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 8, 1 }
                }
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 10
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 1.25
                    Dynamics: pointer = VfxAnimatedFloatVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[f32] = {
                            1.25
                        }
                    }
                }
                ParticleLinger: option[f32] = {
                    11
                }
                Lifetime: option[f32] = {
                    5
                }
                EmitterName: string = "Embers2"
                BirthOrbitalVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 1, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    -1
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 1, 0 }
                        }
                    }
                }
                BirthVelocity: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 700, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.300000012
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 0, 700, 0 }
                        }
                    }
                }
                BirthDrag: embed = ValueVector3 {
                    ConstantValue: vec3 = { 0, 4, 0 }
                }
                WorldAcceleration: embed = IntegratedValueVector3 {
                    ConstantValue: vec3 = { 300, 25, 0 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1.25
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 300, 25, 0 }
                        }
                    }
                }
                SpawnShape: pointer = VfxShapeLegacy {
                    EmitOffset: embed = ValueVector3 {
                        ConstantValue: vec3 = { 200, 0, 200 }
                        Dynamics: pointer = VfxAnimatedVector3fVariableData {
                            ProbabilityTables: list[pointer] = {
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                                VfxProbabilityTableData {}
                                VfxProbabilityTableData {
                                    KeyTimes: list[f32] = {
                                        0
                                        1
                                    }
                                    KeyValues: list[f32] = {
                                        -1
                                        1
                                    }
                                }
                            }
                            Times: list[f32] = {
                                0
                            }
                            Values: list[vec3] = {
                                { 200, 0, 200 }
                            }
                        }
                    }
                }
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 1, 1, 0.710002303 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.5
                            1
                        }
                        Values: list[vec4] = {
                            { 0.192156866, 0.164705887, 1, 0 }
                            { 1, 0.172549024, 0.933333337, 1 }
                            { 0.0588235296, 0.00392156886, 0.101960786, 0 }
                        }
                    }
                }
                IsDirectionOriented: flag = true
                DirectionVelocityScale: f32 = 0.00400000019
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 60, 60, 50 }
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        ProbabilityTables: list[pointer] = {
                            VfxProbabilityTableData {
                                KeyTimes: list[f32] = {
                                    0
                                    1
                                }
                                KeyValues: list[f32] = {
                                    0.5
                                    1
                                }
                            }
                            VfxProbabilityTableData {}
                            VfxProbabilityTableData {}
                        }
                        Times: list[f32] = {
                            0
                        }
                        Values: list[vec3] = {
                            { 60, 60, 50 }
                        }
                    }
                }
                Scale0: embed = ValueVector3 {
                    Dynamics: pointer = VfxAnimatedVector3fVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            1
                        }
                        Values: list[vec3] = {
                            { 0, 0, 0 }
                            { 1, 1, 1 }
                            { 1, 0, 1 }
                        }
                    }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_P_StardustMote.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                Lifetime: option[f32] = {
                    5
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Ground_Mesh2"
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 1
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 1, 0.97999543, 1, 0.700007617 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.899999976
                            0.999899983
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                        }
                    }
                }
                Pass: i16 = -1900
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.0299999993
                            }
                            Values: list[f32] = {
                                2
                                0
                            }
                        }
                    }
                    UseLingerErosionDriveCurve: bool = true
                    LingerErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.150000006
                                1
                            }
                            Values: list[f32] = {
                                0
                                0.200000003
                                1
                            }
                        }
                    }
                    ErosionMapName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Tar_Ground_erode.tex"
                }
                DisableBackfaceCull: bool = true
                MiscRenderFlags: u8 = 1
                ParticleIsLocalOrientation: flag = true
                IsUniformScale: flag = true
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 90 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 370, 760, 0.5 }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Tar_Ground.tex"
            }
            VfxEmitterDefinitionData {
                Rate: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                ParticleLifetime: embed = ValueFloat {
                    ConstantValue: f32 = 5
                }
                Lifetime: option[f32] = {
                    5
                }
                IsSingleParticle: flag = true
                EmitterName: string = "Energy Cracks"
                Primitive: pointer = VfxPrimitiveArbitraryQuad {}
                BlendMode: u8 = 4
                BirthColor: embed = ValueColor {
                    ConstantValue: vec4 = { 0.839993894, 0.059998475, 1, 0.820004582 }
                }
                Color: embed = ValueColor {
                    Dynamics: pointer = VfxAnimatedColorVariableData {
                        Times: list[f32] = {
                            0
                            0.100000001
                            0.899999976
                            0.999899983
                        }
                        Values: list[vec4] = {
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                            { 1, 1, 1, 1 }
                        }
                    }
                }
                Pass: i16 = -1900
                AlphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    ErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.0299999993
                            }
                            Values: list[f32] = {
                                2
                                0
                            }
                        }
                    }
                    UseLingerErosionDriveCurve: bool = true
                    LingerErosionDriveCurve: embed = ValueFloat {
                        Dynamics: pointer = VfxAnimatedFloatVariableData {
                            Times: list[f32] = {
                                0
                                0.150000006
                                1
                            }
                            Values: list[f32] = {
                                0
                                0.200000003
                                1
                            }
                        }
                    }
                    ErosionMapName: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Tar_Ground_erode.tex"
                }
                DisableBackfaceCull: bool = true
                MiscRenderFlags: u8 = 1
                ParticleIsLocalOrientation: flag = true
                IsUniformScale: flag = true
                BindWeight: embed = ValueFloat {
                    ConstantValue: f32 = 1
                }
                IsGroundLayer: flag = true
                UseNavmeshMask: flag = true
                BirthRotation0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 90, 0, 90 }
                }
                BirthScale0: embed = ValueVector3 {
                    ConstantValue: vec3 = { 360, 760, 0.5 }
                }
                Texture: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_Q_Mis_Energy.tex"
                BirthUvScrollRate: embed = ValueVector2 {
                    ConstantValue: vec2 = { 0.25, 0.25 }
                }
                UvScale: embed = ValueVector2 {
                    ConstantValue: vec2 = { 2, 2 }
                }
                TextureMult: pointer = VfxTextureMultDefinitionData {
                    TextureMult: string = "ASSETS/Characters/zac/Skins/Base/Particles/Morgana_Base_W_Tar_LightMult.tex"
                }
            }
        }
        ParticleName: string = "my_morgana_poca"
        ParticlePath: string = "my_morgana_poca"
        Flags: u16 = 199
    }
    "Characters/Zac/Skins/Skin0/Resources" = ResourceResolver {
        ResourceMap: map[hash,link] = {
            "Zac_E_Moving" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Moving"
            "Zac_BA_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_BA_tar"
            "Zac_E_LandPositionIndicator" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_LandPositionIndicator"
            "Zac_E_LandSplash" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_LandSplash"
            "Zac_E_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_tar"
            "Zac_E_Tar_green" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Tar_green"
            "Zac_E_Tar_red" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_E_Tar_red"
            "Zac_P_Chunk" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Chunk"
            "Zac_P_Chunk_OT" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Chunk_OT"
            "Zac_P_Chunk_SelfHighlight" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Chunk_SelfHighlight"
            "Zac_P_Explosion" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_P_Explosion"
            "Zac_Q_Beam_Disconnect" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Disconnect"
            "Zac_Q_Beam_Pull_Left" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Left"
            "Zac_Q_Beam_Pull_Right" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Pull_Right"
            "Zac_Q_Beam_Target1" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Target1"
            "Zac_Q_Beam_Target2" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Beam_Target2"
            "Zac_Q_Indicator_ally" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Indicator_ally"
            "Zac_Q_Indicator_Enemy" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Indicator_Enemy"
            "Zac_Q_Mis" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Mis"
            "Zac_Q_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar"
            "Zac_Q_tar_zaconly" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar_zaconly"
            "Zac_Q_Tether_Indicator_Enemy_Detachment" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Tether_Indicator_Enemy_Detachment"
            "Zac_Q_Tether_Indicator_Zac_Collide_Distance" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_Tether_Indicator_Zac_Collide_Distance"
            "Zac_R_Bubble" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_Bubble"
            "Zac_R_charge_indicator_enemy" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_charge_indicator_enemy"
            "Zac_R_FirstSlam" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_FirstSlam"
            "Zac_R_indicator_inner_circle_ally_charged" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_indicator_inner_circle_ally_charged"
            "Zac_R_indicator_inner_circle_ally_uncharged" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_indicator_inner_circle_ally_uncharged"
            "Zac_R_indicator_outer_circle_ally_charged" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_indicator_outer_circle_ally_charged"
            "Zac_R_indicator_outer_circle_ally_uncharged" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_indicator_outer_circle_ally_uncharged"
            "Zac_R_Launch" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_Launch"
            "Zac_R_Puddle" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_Puddle"
            "Zac_R_PuddleToBubble" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_PuddleToBubble"
            "Zac_R_Puddle_Brush" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_Puddle_Brush"
            "Zac_R_slow_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_slow_tar"
            "Zac_R_SmallerSlam" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_SmallerSlam"
            "Zac_R_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_R_tar"
            0x1c1ea8de = 0x1c1ea8de
            0xa55ad994 = 0xa55ad994
            0xffbf2a72 = 0xffbf2a72
            0x750697cc = 0x750697cc
            0x9071bd64 = 0x9071bd64
            0x04ff5c13 = 0x04ff5c13
            0xa2fa6a01 = 0xa2fa6a01
            0x7b3a4b5f = 0x7b3a4b5f
            "Zac_W_cas" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_cas"
            "Zac_W_Chunk_Death" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_Chunk_Death"
            "Zac_W_Chunk_Splat" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_Chunk_Splat"
            "Zac_W_Chunk_Splat_OT" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_Chunk_Splat_OT"
            "Zac_W_Heal" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_Heal"
            "Zac_W_tar" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_tar"
            "Zac_W_tar_zaconly" = "Characters/Zac/Skins/Skin0/Particles/Zac_Base_W_tar_zaconly"
            0xc82d4898 = "Characters/Zac/Skins/Skin0/Particles/Zac_ChunkCrushedByEnemySound"
            0x14b39b9e = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_death_sound"
            0x6d940df2 = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_joke_loop_sound"
            0xb079b025 = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_joke_sound"
            0xadccb63f = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_laugh2_sound"
            0xd8c3d1c9 = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_laugh_sound"
            0xde029748 = "Characters/Zac/Skins/Skin0/Particles/Zac_emote_taunt_sound"
            0x5ee78f47 = "Characters/Zac/Skins/Skin0/Particles/Zac_E_Ground_Start"
            0x623a3ea7 = "Characters/Zac/Skins/Skin0/Particles/Zac_R_FirstSlam_SKN1"
            0xfca9c949 = "Characters/Zac/Skins/Skin0/Particles/Zac_R_SmallerSlam_SKN1"
            0x67aa017a = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_Chunk"
            0x1f139786 = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_Chunk_OT"
            0xbe421af9 = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_W_Chunk_Death"
            0xf449f14f = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_W_Chunk_Death_OT"
            0xdad2ad2c = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_W_Chunk_Timeout"
            0xe72ad8cc = "Characters/Zac/Skins/Skin0/Particles/Zac_SKN1_W_Chunk_Timeout_OT"
        }
    }
    "Characters/Zac/Animations/Skin0" = AnimationGraphData {
        mCascadeBlendValue: f32 = 0
        mClipDataMap: map[hash,pointer] = {
            "Death_Passive" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_death.anm"
                }
            }
            0xd7d89ccc = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_attack1.anm"
                }
            }
            0x6d8c812b = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_attack2.anm"
                }
            }
            0x4dce503b = AtomicClipData {
                mFlags: u32 = 2
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_channel_windup.anm"
                }
            }
            "Crit" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_crit.anm"
                }
            }
            "Idle2_Base" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Idle2.anm"
                }
            }
            0x76bbc6a0 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Idle3.anm"
                }
            }
            0xabc75b53 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0333333388
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Idle4.anm"
                }
            }
            "Spell3" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle1.anm"
                }
            }
            "Idle1_Base" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0500000007
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle1.anm"
                }
            }
            "Spell3_Flying" = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x831fa58e = SubmeshVisibilityEventData {
                        mName: hash = 0x831fa58e
                        mShowSubmeshList: list[hash] = {
                            "Tail"
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_spell3_flying.anm"
                }
            }
            0xda0f555e = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle_in1.anm"
                }
            }
            "Idle1" = SequencerClipData {
                mClipNameList: list[hash] = {
                    0xdcc88589
                    0xe75f72aa
                }
            }
            0xc0a21e69 = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0333333388
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle_in2.anm"
                }
            }
            0x0c656e32 = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_attack3.anm"
                }
            }
            0x406bcb89 = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_attack4.anm"
                }
            }
            "Attack1" = SelectorClipData {
                mSelectorPairDataList: list[embed] = {
                    SelectorPairData {
                        mClipName: hash = 0xd7d89ccc
                        mProbability: f32 = 1
                    }
                    SelectorPairData {
                        mClipName: hash = 0x406bcb89
                        mProbability: f32 = 1
                    }
                }
            }
            0xe4ee0bf8 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle_in3.anm"
                }
            }
            "Channel_Base" = AtomicClipData {
                mFlags: u32 = 2
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_channel.anm"
                }
            }
            0x14f21665 = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x69b12239 = SubmeshVisibilityEventData {
                        mName: hash = 0x69b12239
                        mEndFrame: f32 = 13
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                    0xee1ab011 = SoundEventData {
                        mName: hash = 0xee1ab011
                        mSoundName: string = "Play_sfx_Zac_Respawn"
                        mIsLoop: bool = false
                        mIsKillEvent: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_respawn.anm"
                }
            }
            0x1903a210 = AtomicClipData {
                mFlags: u32 = 2
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_recall.anm"
                }
            }
            "Recall_LeadIn" = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0xf58d1cbb = SoundEventData {
                        mSoundName: string = "Play_sfx_Zac_Recallleadin"
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_recall_leadin.anm"
                }
            }
            0x13f95189 = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x69b12239 = SubmeshVisibilityEventData {
                        mName: hash = 0x69b12239
                        mStartFrame: f32 = 6
                        mEndFrame: f32 = 30
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_recall_back.anm"
                }
            }
            "Recall_Leadout" = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0333333388
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_recall_leadout.anm"
                }
            }
            0x9e55a33e = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x0cf0606b = ParticleEventData {
                        mName: hash = 0x0cf0606b
                        mStartFrame: f32 = 5
                        mEffectKey: hash = 0xd8c3d1c9
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_laugh.anm"
                }
            }
            0x9d46ce26 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_joke.anm"
                }
            }
            "Death" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x69b12239 = SubmeshVisibilityEventData {
                        mName: hash = 0x69b12239
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                    "Audio_Death" = ParticleEventData {
                        mName: hash = "Audio_Death"
                        mEffectKey: hash = 0x14b39b9e
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_death2.anm"
                }
            }
            "Dance" = AtomicClipData {
                mFlags: u32 = 2
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x0a525c46 = SoundEventData {
                        mSoundName: string = "Play_sfx_Zac_Dance"
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_dance.anm"
                }
            }
            "Recall" = SequencerClipData {
                mFlags: u32 = 2
                mClipNameList: list[hash] = {
                    "Recall_LeadIn"
                    0x1903a210
                }
                mEventDataMap: map[hash,pointer] = {
                    0x1b5d9a25 = ParticleEventData {
                        mName: hash = 0x1b5d9a25
                        mStartFrame: f32 = 250
                        mEffectKey: hash = 0xf05a84d5
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = false
                    }
                }
            }
            "Attack2" = SelectorClipData {
                mSelectorPairDataList: list[embed] = {
                    SelectorPairData {
                        mClipName: hash = 0x0c656e32
                        mProbability: f32 = 1
                    }
                    SelectorPairData {
                        mClipName: hash = 0x6d8c812b
                        mProbability: f32 = 1
                    }
                }
            }
            "Respawn" = SequencerClipData {
                mFlags: u32 = 8
                mClipNameList: list[hash] = {
                    0x14f21665
                    "Idle1_Base"
                    0xe75f72aa
                }
            }
            "Channel_Wndup" = SequencerClipData {
                mFlags: u32 = 2
                mClipNameList: list[hash] = {
                    0x4dce503b
                    "Channel_WUp_LeadIn"
                }
            }
            0x0f330190 = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Channel_leadin.anm"
                }
            }
            "Channel_WUp_LeadIn" = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Channel_Wup_leadin.anm"
                }
            }
            "Channel" = SequencerClipData {
                mFlags: u32 = 2
                mClipNameList: list[hash] = {
                    0x0f330190
                    "Channel_Base"
                }
            }
            0xed8e4c0c = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x0cf0606b = ParticleEventData {
                        mName: hash = 0x0cf0606b
                        mStartFrame: f32 = 5
                        mEffectKey: hash = 0xadccb63f
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Laugh2.anm"
                }
            }
            "Laugh" = SequencerClipData {
                mClipNameList: list[hash] = {
                    0x3715f5e2
                    "Idle1_Base"
                    0xe75f72aa
                }
            }
            "Spell2" = AtomicClipData {
                mMaskDataName: hash = 0x5ad57b83
                mTrackDataName: hash = "ScaleTrack"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell2_scale.anm"
                }
            }
            "Pickup" = AtomicClipData {
                mMaskDataName: hash = "ScaleBody"
                mTrackDataName: hash = "ScaleTrack"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Pickup.anm"
                }
            }
            "Joke_Loop" = AtomicClipData {
                mFlags: u32 = 6
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "BUBBLE" = SubmeshVisibilityEventData {
                        mName: hash = "BUBBLE"
                        mShowSubmeshList: list[hash] = {
                            "Ult"
                        }
                    }
                    0xeed2417d = ParticleEventData {
                        mName: hash = 0xeed2417d
                        mStartFrame: f32 = 32
                        mEffectKey: hash = 0x6d940df2
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                    0x194d360c = SubmeshVisibilityEventData {
                        mName: hash = 0x194d360c
                        mHideSubmeshList: list[hash] = {
                            0x194d360c
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Joke2_Loop.anm"
                }
            }
            "Joke_Windup" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "BUBBLE" = SubmeshVisibilityEventData {
                        mName: hash = "BUBBLE"
                        mStartFrame: f32 = 34
                        mShowSubmeshList: list[hash] = {
                            "Ult"
                        }
                    }
                    0xeed2417d = ParticleEventData {
                        mName: hash = 0xeed2417d
                        mStartFrame: f32 = 10
                        mEffectKey: hash = 0xb079b025
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                    0x194d360c = SubmeshVisibilityEventData {
                        mName: hash = 0x194d360c
                        mStartFrame: f32 = 40
                        mHideSubmeshList: list[hash] = {
                            0x194d360c
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Joke2_Windup.anm"
                }
            }
            "Joke" = SequencerClipData {
                mFlags: u32 = 4
                mClipNameList: list[hash] = {
                    "Joke_Windup"
                    "Joke_Loop"
                }
            }
            "Run_Fast" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0399999991
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_run.anm"
                }
            }
            "Run" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_run_Slow.anm"
                }
            }
            "Run_Haste" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mTickDuration: f32 = 0.0500000007
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_run_Haste.anm"
                }
            }
            "Recall_Winddown" = SequencerClipData {
                mFlags: u32 = 8
                mClipNameList: list[hash] = {
                    0x13f95189
                    "Respawn"
                    0xe75f72aa
                }
            }
            "Spell1" = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = SkinScaleParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = "Spell1_Max"
                        mValue: f32 = 0.699999988
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell1_Min"
                        mValue: f32 = 1.35000002
                    }
                }
            }
            "Death_Unite" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Death_unite.anm"
                }
            }
            0x8e511fc3 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x69b12239 = SubmeshVisibilityEventData {
                        mName: hash = 0x69b12239
                        mEndFrame: f32 = 157
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Death_unite.anm"
                }
            }
            "Spell3_Windup" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x5981b313 = ParticleEventData {
                        mName: hash = 0x5981b313
                        mStartFrame: f32 = 9
                        mEffectKey: hash = 0x5ee78f47
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x52aa6ecd
                            }
                        }
                        mIsLoop: bool = false
                        mIsKillEvent: bool = false
                    }
                    0x7781e24d = ParticleEventData {
                        mName: hash = 0x7781e24d
                        mStartFrame: f32 = 7
                        mEffectKey: hash = 0x5ee78f47
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x00309683
                            }
                        }
                        mIsLoop: bool = false
                        mIsKillEvent: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_spell3_windup.anm"
                }
            }
            0x792ee8b0 = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x73cb9f1b = SoundEventData {
                        mSoundName: string = "Play_sfx_Zac_Zac_blastcone_fly"
                        mIsLoop: bool = false
                        mIsKillEvent: bool = false
                    }
                    "HideBody" = SubmeshVisibilityEventData {
                        mHideSubmeshList: list[hash] = {
                            "BODY"
                            0x194d360c
                        }
                    }
                    0x52aff94d = ParticleEventData {
                        mName: hash = 0x52aff94d
                        mStartFrame: f32 = 15
                        mEndFrame: f32 = 25
                        mEffectKey: hash = 0xf0dd894b
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                    0x3afd74a3 = ParticleEventData {
                        mName: hash = 0x3afd74a3
                        mStartFrame: f32 = 15
                        mEndFrame: f32 = 25
                        mEffectKey: hash = 0xf0dd894b
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_spell4.anm"
                }
            }
            0xe75f72aa = SelectorClipData {
                mSelectorPairDataList: list[embed] = {
                    SelectorPairData {
                        mClipName: hash = "Idle1_Base"
                        mProbability: f32 = 70
                    }
                    SelectorPairData {
                        mClipName: hash = "Idle2_Base"
                        mProbability: f32 = 10
                    }
                    SelectorPairData {
                        mClipName: hash = 0x76bbc6a0
                        mProbability: f32 = 10
                    }
                    SelectorPairData {
                        mClipName: hash = 0xabc75b53
                        mProbability: f32 = 10
                    }
                }
            }
            0x97a61c8b = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_idle_in4.anm"
                }
            }
            0xdcc88589 = SelectorClipData {
                mFlags: u32 = 8
                mSelectorPairDataList: list[embed] = {
                    SelectorPairData {
                        mClipName: hash = 0xda0f555e
                        mProbability: f32 = 20
                    }
                    SelectorPairData {
                        mClipName: hash = 0xc0a21e69
                        mProbability: f32 = 30
                    }
                    SelectorPairData {
                        mClipName: hash = 0xe4ee0bf8
                        mProbability: f32 = 20
                    }
                    SelectorPairData {
                        mClipName: hash = 0x97a61c8b
                        mProbability: f32 = 40
                    }
                }
            }
            0x3715f5e2 = SelectorClipData {
                mFlags: u32 = 8
                mSelectorPairDataList: list[embed] = {
                    SelectorPairData {
                        mClipName: hash = 0x9e55a33e
                        mProbability: f32 = 50
                    }
                    SelectorPairData {
                        mClipName: hash = 0xed8e4c0c
                        mProbability: f32 = 50
                    }
                }
            }
            "Spell1_B1" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_B1.anm"
                }
            }
            "Spell1_B2" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_B2.anm"
                }
            }
            "Spell1_B3" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_B3.anm"
                }
            }
            0x7a76d2b8 = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = SkinScaleParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = "Spell1_B3"
                        mValue: f32 = 0.699999988
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell1_B1"
                        mValue: f32 = 1.35000002
                    }
                }
            }
            0x763545ac = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = SkinScaleParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = "Spell1_B2"
                        mValue: f32 = 0.699999988
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell1_B1"
                        mValue: f32 = 1.35000002
                    }
                }
            }
            0x811243f8 = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = LookAtSpellTargetDistanceParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = "Spell1_B1"
                        mValue: f32 = 0.699999988
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell1_B1"
                        mValue: f32 = 1.35000002
                    }
                }
            }
            "Spell1_Max" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x8f4bce42 = ParticleEventData {
                        mName: hash = 0x8f4bce42
                        mStartFrame: f32 = 10
                        mEndFrame: f32 = 36
                        mEffectKey: hash = 0x750697cc
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_max.anm"
                }
            }
            "Spell1_Min" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x7b775cdc = ParticleEventData {
                        mName: hash = 0x7b775cdc
                        mStartFrame: f32 = 10
                        mEndFrame: f32 = 120
                        mEffectKey: hash = 0x9071bd64
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_min.anm"
                }
            }
            0xbbcd0c9b = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = IsMovingParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = "Spell1_Regrow_Idle"
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell1_Regrow_Run"
                        mValue: f32 = 1
                    }
                }
            }
            "Spell1_Regrow_Idle" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_Regrow_Idle.anm"
                }
            }
            "Spell1_Regrow_Run" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_Regrow_Run.anm"
                }
            }
            "Spell1_Slam" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell1_Slam.anm"
                }
            }
            "Spell3_Back" = ParametricClipData {
                mTrackDataName: hash = "Default"
                Updater: pointer = IsMovingParametricUpdater {}
                mParametricPairDataList: list[embed] = {
                    ParametricPairData {
                        mClipName: hash = 0xf766b776
                    }
                    ParametricPairData {
                        mClipName: hash = "Spell3_BackRun"
                        mValue: f32 = 1
                    }
                }
            }
            "Spell3_BackRun" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0xb638e658 = SubmeshVisibilityEventData {
                        mEndFrame: f32 = 13
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                    0x831fa58e = SubmeshVisibilityEventData {
                        mEndFrame: f32 = 10
                        mName: hash = 0x831fa58e
                        mHideSubmeshList: list[hash] = {
                            "Tail"
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell3_backRun.anm"
                }
            }
            0xf766b776 = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0xb638e658 = SubmeshVisibilityEventData {
                        mName: hash = 0xb638e658
                        mEndFrame: f32 = 13
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_spell3_back.anm"
                }
            }
            "Taunt" = SequencerClipData {
                mClipNameList: list[hash] = {
                    "Taunt_Base"
                    "Idle1_Base"
                    0xe75f72aa
                }
            }
            "Taunt_Base" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "Audio_Taunt" = ParticleEventData {
                        mName: hash = "Audio_Taunt"
                        mStartFrame: f32 = 57
                        mEffectKey: hash = 0xde029748
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {}
                        }
                        mIsLoop: bool = false
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_taunt.anm"
                }
            }
            "Spell4" = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "HideBody" = SubmeshVisibilityEventData {
                        mHideSubmeshList: list[hash] = {
                            "BODY"
                            0x194d360c
                        }
                    }
                    0x73f6d90a = ParticleEventData {
                        mName: hash = 0x73f6d90a
                        mStartFrame: f32 = 15
                        mEndFrame: f32 = 25
                        mEffectKey: hash = 0xa55ad994
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 15
                        mEndFrame: f32 = 25
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Revert_spell4.anm"
                }
            }
            0xda949924 = AtomicClipData {
                mFlags: u32 = 8
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "HideBody" = SubmeshVisibilityEventData {
                        mHideSubmeshList: list[hash] = {
                            "BODY"
                            0x194d360c
                        }
                    }
                    0x73f6d90a = ParticleEventData {
                        mName: hash = 0x73f6d90a
                        mStartFrame: f32 = 26
                        mEndFrame: f32 = 50
                        mEffectKey: hash = 0xa55ad994
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 26
                        mEndFrame: f32 = 50
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Revert_Spell4_2.anm"
                }
            }
            0x4f25d6ab = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    "HideBody" = SubmeshVisibilityEventData {
                        mEndFrame: f32 = 83
                        mHideSubmeshList: list[hash] = {
                            "BODY"
                            0x194d360c
                        }
                    }
                    0x73f6d90a = ParticleEventData {
                        mName: hash = 0x73f6d90a
                        mStartFrame: f32 = 51
                        mEndFrame: f32 = 86
                        mEffectKey: hash = 0xa55ad994
                        mParticleEventDataPairList: list[embed] = {
                            ParticleEventDataPair {
                                mBoneName: hash = 0x3ddef4e8
                            }
                        }
                        mIsKillEvent: bool = true
                    }
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 51
                        mEndFrame: f32 = 86
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell4_3.anm"
                }
            }
            "Spell4_Windup" = AtomicClipData {
                mFlags: u32 = 1
                mTrackDataName: hash = "Default"
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Revert_spell4_windup.anm"
                }
                mEventDataMap: map[hash,pointer] = {
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 13
                        mEndFrame: f32 = 14
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
            }
            "Spell4_ToRun" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x5caad4a5 = SubmeshVisibilityEventData {
                        mEndFrame: f32 = 3
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 77
                        mEndFrame: f32 = 87
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell4_SnapCastRun.anm"
                }
            }
            "Spell4_ToIdle" = AtomicClipData {
                mTrackDataName: hash = "Default"
                mEventDataMap: map[hash,pointer] = {
                    0x5caad4a5 = SubmeshVisibilityEventData {
                        mEndFrame: f32 = 3
                        mShowSubmeshList: list[hash] = {
                            0x69b12239
                        }
                    }
                    0x1cc824d2 = ParticleEventData {
                        mName: hash = 0x1cc824d2
                        mStartFrame: f32 = 77
                        mEndFrame: f32 = 87
                        mEffectKey: hash = 0x7b3a4b5f
                        mIsKillEvent: bool = true
                    }
                }
                mAnimationResourceData: embed = AnimationResourceData {
                    mAnimationFilePath: string = "ASSETS/Characters/Zac/Skins/Base/Animations/Zac_Spell4_SnapCast.anm"
                }
            }
            0x11da97ed = ConditionBoolClipData {
                Updater: pointer = IsMovingParametricUpdater {}
                mTrueConditionClipName: hash = "Spell4_ToRun"
                mFalseConditionClipName: hash = "Spell4_ToIdle"
            }
            0x4bb8c551 = SequencerClipData {
                mFlags: u32 = 8
                mClipNameList: list[hash] = {
                    0x4f25d6ab
                    0x11da97ed
                }
            }
        }
        mMaskDataMap: map[hash,embed] = {
            "ScaleBody" = MaskData {
                mId: u32 = 1
                mWeightList: list[f32] = {
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                }
            }
            0x5ad57b83 = MaskData {
                mId: u32 = 2
                mWeightList: list[f32] = {
                    0
                    0
                    0
                    0
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    0
                    0
                    0
                    0
                    0
                    0
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    0
                    0
                    0
                    0
                    0
                    0
                    1
                    1
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    0
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                    1
                }
            }
        }
        mTrackDataMap: map[hash,embed] = {
            "ScaleTrack" = TrackData {
                mBlendMode: u8 = 1
            }
            "Default" = TrackData {
                mPriority: u8 = 1
            }
        }
        mBlendDataTable: map[u64,pointer] = {
            574043308619688281 = TimeBlendData {
                mTime: f32 = 0
            }
            574043311659597133 = TimeBlendData {
                mTime: f32 = 0
            }
            893241262338305586 = TimeBlendData {
                mTime: f32 = 0
            }
            893241265303895373 = TimeBlendData {
                mTime: f32 = 0
            }
            1095220852623081872 = TimeBlendData {
                mTime: f32 = 0
            }
            1095220855541644621 = TimeBlendData {
                mTime: f32 = 0
            }
            1439271205109059977 = TimeBlendData {
                mTime: f32 = 0
            }
            1439271207947517261 = TimeBlendData {
                mTime: f32 = 0
            }
            1509293448521455205 = TimeBlendData {
                mTime: f32 = 0
            }
            1509293451343609165 = TimeBlendData {
                mTime: f32 = 0
            }
            1802462465901175312 = TimeBlendData {
                mTime: f32 = 0
            }
            1802462468655070541 = TimeBlendData {
                mTime: f32 = 0
            }
            1953208035545133148 = TimeBlendData {
                mTime: f32 = 0
            }
            1953208038263930189 = TimeBlendData {
                mTime: f32 = 0
            }
            2372166788104036640 = TimeBlendData {
                mTime: f32 = 0
            }
            2372166790725287245 = TimeBlendData {
                mTime: f32 = 0
            }
            2432597616235167053 = TimeBlendData {
                mTime: f32 = 0
            }
            2786235694625501850 = TimeBlendData {
                mTime: f32 = 0
            }
            2786235697150344525 = TimeBlendData {
                mTime: f32 = 0
            }
            3084207950027116234 = TimeBlendData {
                mTime: f32 = 0
            }
            3084207952482581837 = TimeBlendData {
                mTime: f32 = 0
            }
            3335977651178880333 = TimeBlendData {
                mTime: f32 = 0
            }
            4326130931166970153 = TimeBlendData {
                mTime: f32 = 0
            }
            4326130933333278029 = TimeBlendData {
                mTime: f32 = 0
            }
            4642027631287192457 = TimeBlendData {
                mTime: f32 = 0
            }
            4642027633379949901 = TimeBlendData {
                mTime: f32 = 0
            }
            4703778291671575919 = TimeBlendData {
                mTime: f32 = 0
            }
            4703778293749955917 = TimeBlendData {
                mTime: f32 = 0
            }
            4757530672747822413 = TimeBlendData {
                mTime: f32 = 0
            }
            5606506801761505339 = TimeBlendData {
                mTime: f32 = 0
            }
            5606506803629702477 = TimeBlendData {
                mTime: f32 = 0
            }
            6247030502141246797 = TimeBlendData {
                mTime: f32 = 0
            }
            6463208476870491469 = TimeBlendData {
                mTime: f32 = 0
            }
            6521702302194646349 = TimeBlendData {
                mTime: f32 = 0
            }
            7591081627721724037 = TimeBlendData {
                mTime: f32 = 0
            }
            7591081629127851341 = TimeBlendData {
                mTime: f32 = 0
            }
            7794375147286900454 = TimeBlendData {
                mTime: f32 = 0
            }
            7794375148645694797 = TimeBlendData {
                mTime: f32 = 0
            }
            7893826270395138347 = TimeBlendData {
                mTime: f32 = 0
            }
            7893826271730777421 = TimeBlendData {
                mTime: f32 = 0
            }
            8170100522811000611 = TimeBlendData {
                mTime: f32 = 0
            }
            8170100524082314573 = TimeBlendData {
                mTime: f32 = 0
            }
            8555650309609473696 = TimeBlendData {
                mTime: f32 = 0
            }
            8555650310791019853 = TimeBlendData {
                mTime: f32 = 0
            }
            3813979866528610939 = TimeBlendData {
                mTime: f32 = 0
            }
            3813979868814163277 = TimeBlendData {
                mTime: f32 = 0
            }
            9938095950027865421 = TimeBlendData {
                mTime: f32 = 0
            }
            10058776078549826893 = TimeBlendData {
                mTime: f32 = 0
            }
            10255012752051977549 = TimeBlendData {
                mTime: f32 = 0
            }
            10832289109403501965 = TimeBlendData {
                mTime: f32 = 0
            }
            10832289110054976845 = TimeBlendData {
                mTime: f32 = 0
            }
            11332972177567174182 = TimeBlendData {
                mTime: f32 = 0
            }
            11332972178102074701 = TimeBlendData {
                mTime: f32 = 0
            }
            11374364255402376525 = TimeBlendData {
                mTime: f32 = 0
            }
            11409204720352731966 = TimeBlendData {
                mTime: f32 = 0
            }
            11409204720869883213 = TimeBlendData {
                mTime: f32 = 0
            }
            11490697228480724301 = TimeBlendData {
                mTime: f32 = 0
            }
            11831733634831269197 = TimeBlendData {
                mTime: f32 = 0
            }
            12030939629306149849 = TimeBlendData {
                mTime: f32 = 0
            }
            12030939629678542157 = TimeBlendData {
                mTime: f32 = 0
            }
            12098794301507997008 = TimeBlendData {
                mTime: f32 = 0
            }
            12098794301628572504 = TimeBlendData {
                mTime: f32 = 0
            }
            12098794301864590669 = TimeBlendData {
                mTime: f32 = 0
            }
            12167572168680979789 = TimeBlendData {
                mTime: f32 = 0
            }
            12377962515773479763 = TimeBlendData {
                mTime: f32 = 0
            }
            12377962516065074509 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113647551320 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113883569485 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114670559028 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605523311949 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13039675255205280654 = TimeBlendData {
                mTime: f32 = 0
            }
            13039675255342808397 = TimeBlendData {
                mTime: f32 = 0
            }
            13111734580131806497 = TimeBlendData {
                mTime: f32 = 0
            }
            13111734580252556621 = TimeBlendData {
                mTime: f32 = 0
            }
            13156647006022188365 = TimeBlendData {
                mTime: f32 = 0
            }
            13590883339398317155 = TimeBlendData {
                mTime: f32 = 0
            }
            13590883339407506765 = TimeBlendData {
                mTime: f32 = 0
            }
            13630352413820501325 = TimeBlendData {
                mTime: f32 = 0
            }
            13880690441003253069 = TimeBlendData {
                mTime: f32 = 0
            }
            13880690441061539433 = TimeBlendData {
                mTime: f32 = 0
            }
            13987674971085258061 = TimeBlendData {
                mTime: f32 = 0
            }
            15401350653266148685 = TimeBlendData {
                mTime: f32 = 0
            }
            15553353716284833101 = TimeBlendData {
                mTime: f32 = 0
            }
            15553353716732566732 = TimeBlendData {
                mTime: f32 = 0
            }
            15712871490307800397 = TimeBlendData {
                mTime: f32 = 0
            }
            15712871490792674654 = TimeBlendData {
                mTime: f32 = 0
            }
            16132709916495887693 = TimeBlendData {
                mTime: f32 = 0
            }
            16132709917078513201 = TimeBlendData {
                mTime: f32 = 0
            }
            16496135648058064205 = TimeBlendData {
                mTime: f32 = 0
            }
            16496135648725306360 = TimeBlendData {
                mTime: f32 = 0
            }
            16508922229554724173 = TimeBlendData {
                mTime: f32 = 0
            }
            16508922230224943436 = TimeBlendData {
                mTime: f32 = 0
            }
            16725689280523451725 = TimeBlendData {
                mTime: f32 = 0
            }
            16725689281244141000 = TimeBlendData {
                mTime: f32 = 0
            }
            17010446763299487053 = TimeBlendData {
                mTime: f32 = 0
            }
            17010446764086476596 = TimeBlendData {
                mTime: f32 = 0
            }
            17117702851278716237 = TimeBlendData {
                mTime: f32 = 0
            }
            17117702852090678284 = TimeBlendData {
                mTime: f32 = 0
            }
            17371216860747971917 = TimeBlendData {
                mTime: f32 = 0
            }
            17371216861618959794 = TimeBlendData {
                mTime: f32 = 0
            }
            17876238949570624845 = TimeBlendData {
                mTime: f32 = 0
            }
            17876238950559197340 = TimeBlendData {
                mTime: f32 = 0
            }
            18256824853596781901 = TimeBlendData {
                mTime: f32 = 0
            }
            18256824854673966457 = TimeBlendData {
                mTime: f32 = 0
            }
            10058776077718254476 = TimeBlendData {
                mTime: f32 = 0
            }
            10058776078378743912 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            10255012751266095043 = TimeBlendData {
                mTime: f32 = 0
            }
            10255012751880894568 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            10832289109883893864 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            10863445266032408041 = TimeBlendData {
                mTime: f32 = 0
            }
            10863445266505545832 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            10863445266676628813 = TimeBlendData {
                mTime: f32 = 0
            }
            10927452931731365003 = TimeBlendData {
                mTime: f32 = 0
            }
            10927452932189599848 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            10927452932360682829 = TimeBlendData {
                mTime: f32 = 0
            }
            1095220855370561640 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            11332972177930991720 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            11409204720698800232 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12030939629507459176 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12098794301693507688 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12377962515893991528 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12616662110710005760 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110824161516 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110843660633 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110857716754 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110874494373 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110917979698 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110918962241 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662110965006736 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111045112201 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111061415525 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111129674256 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111164772444 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111358726810 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111428103882 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111486723583 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111717261609 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111790812041 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111817704688 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662111935484516 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112015372347 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112477442181 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112524775142 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112547930411 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112612255523 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112693208492 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112702023328 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112743123120 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112764613304 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662112875463672 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113006857334 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113051997068 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113097686979 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113232094605 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113239348713 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113254251659 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113348668966 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113366418238 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113511177177 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113591974739 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113712486504 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113728818345 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113746041742 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113762819361 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113860783259 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662113941855849 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114029535559 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114331303116 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114368443742 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114466194993 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114550811640 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114553788748 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114604258760 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114695531532 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114860709750 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114872141980 = TimeBlendData {
                mTime: f32 = 0
            }
            12616662114960754041 = TimeBlendData {
                mTime: f32 = 0
            }
            12895556602463903980 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602483403097 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602497459218 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602514236837 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602557722162 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602558704705 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602604749200 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602684854665 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602701157989 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602769416720 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602804514908 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556602998469274 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603067846346 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603126466047 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603357004073 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603430554505 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603457447152 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603575226980 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556603655114811 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604117184645 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604164517606 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604187672875 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604251997987 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604332950956 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604341765792 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604404355768 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604515206136 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604646599798 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604691739532 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604737429443 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604871837069 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604879091177 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604893994123 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556604988411430 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605006160702 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605150919641 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605231717203 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605287293784 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605352228968 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605368560809 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605385784206 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605402561825 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605500525723 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605500656514 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605581598313 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605669278023 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605693762823 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556605971045580 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606008186206 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606105937457 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606190554104 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606193531212 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606244001224 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606335273996 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606500452214 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606511884444 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12895556606600496505 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12965701327625071734 = TimeBlendData {
                mTime: f32 = 0
            }
            12965701327857563113 = TimeBlendData {
                mTime: f32 = 0
            }
            12965701328330700904 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            12965701328347032745 = TimeBlendData {
                mTime: f32 = 0
            }
            12965701328479128450 = TimeBlendData {
                mTime: f32 = 0
            }
            12965701328501783885 = TimeBlendData {
                mTime: f32 = 0
            }
            12965701328672234759 = TimeBlendData {
                mTime: f32 = 0
            }
            13039675255171725416 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13111734580081473640 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13222943558562528589 = TimeBlendData {
                mTime: f32 = 0
            }
            13532486318180153448 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13532486318328450203 = TimeBlendData {
                mTime: f32 = 0
            }
            13532486318351236429 = TimeBlendData {
                mTime: f32 = 0
            }
            13533048061247764584 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13533048061418847565 = TimeBlendData {
                mTime: f32 = 0
            }
            13590883339236423784 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13630352413649418344 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            13880690440832170088 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            14257271927099305078 = TimeBlendData {
                mTime: f32 = 0
            }
            14257271927331796457 = TimeBlendData {
                mTime: f32 = 0
            }
            14257271927804934248 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            14257271927953361794 = TimeBlendData {
                mTime: f32 = 0
            }
            14257271927976017229 = TimeBlendData {
                mTime: f32 = 0
            }
            14257271928121983303 = TimeBlendData {
                mTime: f32 = 0
            }
            14257271928146468103 = TimeBlendData {
                mTime: f32 = 0
            }
            14362433343054035048 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            14362433343225118029 = TimeBlendData {
                mTime: f32 = 0
            }
            1439271207776434280 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            1509293451172526184 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            15553353716113750120 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            15712871490136717416 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            15909112510316854605 = TimeBlendData {
                mTime: f32 = 0
            }
            16132709916324804712 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            16496135647886981224 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            16508922229383641192 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            16672170423192436045 = TimeBlendData {
                mTime: f32 = 0
            }
            16725689280352368744 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            17010446763128404072 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            17117702851107633256 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            17371216859389177574 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            17371216859566425760 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            17371216860456377171 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            17371216860576888936 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            17371216861330597425 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            17827137895429191784 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            17827137895600274765 = TimeBlendData {
                mTime: f32 = 0
            }
            17827137896577415030 = TimeBlendData {
                mTime: f32 = 0
            }
            17876238949399541864 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            1802462468483987560 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            18256824853425698920 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            1953208038092847208 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            2372166789366492902 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            2372166789543741088 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            2372166790433692499 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            2372166790554204264 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            2372166791307912753 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            2786235696979261544 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            3084207952311498856 = TimeBlendData {
                mTime: f32 = 0
            }
            3335977648782034431 = TimeBlendData {
                mTime: f32 = 0
            }
            3335977651007797352 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            3969349000781937997 = TimeBlendData {
                mTime: f32 = 0
            }
            4326130933162195048 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            4642027633208866920 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            4703778292391161574 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            4703778292568409760 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            4703778293458361171 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            4703778293578872936 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            4703778294332581425 = TransitionClipBlendData {
                mClipName: hash = 0xda0f555e
            }
            4757530670681957616 = TimeBlendData {
                mTime: f32 = 0
            }
            4757530672511804248 = TimeBlendData {
                mTime: f32 = 0
            }
            4757530672576739432 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            490295238784311532 = TimeBlendData {
                mTime: f32 = 0
            }
            490295241672636520 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            490295241843719501 = TimeBlendData {
                mTime: f32 = 0
            }
            5231338579940654413 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391179076919532 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391179110474770 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391179127252389 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391180188242532 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391180945966508 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391181017371320 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391181128221688 = TimeBlendData {
                mTime: f32 = 0
            }
            5263391181965244520 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            5263391182136327501 = TimeBlendData {
                mTime: f32 = 0
            }
            5606506803458619496 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            574043311488514152 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            634413888637363218 = TimeBlendData {
                mTime: f32 = 0
            }
            634413891492132968 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            634413891663215949 = TimeBlendData {
                mTime: f32 = 0
            }
            706473213563889061 = TimeBlendData {
                mTime: f32 = 0
            }
            706473216401881192 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            706473216572964173 = TimeBlendData {
                mTime: f32 = 0
            }
            7591081628956768360 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            7794375148474611816 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            7893826271559694440 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8170100523911231592 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8517790877261055404 = TimeBlendData {
                mTime: f32 = 0
            }
            8517790878280333416 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8517790878451416397 = TimeBlendData {
                mTime: f32 = 0
            }
            8555650310619936872 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8732172572162975920 = TimeBlendData {
                mTime: f32 = 0
            }
            8732172573132339304 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8732172573303422285 = TimeBlendData {
                mTime: f32 = 0
            }
            8824472209649488568 = TimeBlendData {
                mTime: f32 = 0
            }
            8824472210597361768 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            8824472210768444749 = TimeBlendData {
                mTime: f32 = 0
            }
            893241265132812392 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            897461252391201857 = TimeBlendData {
                mTime: f32 = 0
            }
            897461255184726120 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            897461255355809101 = TimeBlendData {
                mTime: f32 = 0
            }
            9300570915069903864 = TimeBlendData {
                mTime: f32 = 0
            }
            9300570915906926696 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            9300570916078009677 = TimeBlendData {
                mTime: f32 = 0
            }
            9864902396392975478 = TimeBlendData {
                mTime: f32 = 0
            }
            9864902397098604648 = TimeBlendData {
                mTime: f32 = 0.100000001
            }
            9864902397269687629 = TimeBlendData {
                mTime: f32 = 0
            }
        }
    }
}
