### Nomenclatura Classificatória

* #1 Header Metadata
* #1 Dependency Array
* #1 Root Map
    * #2 Root Entry (SkinCharacterDataProperties)
        * #3 Embed Block (SkinAudioProperties)
            * #4 Primitive Field
        * #3 Graph Link (SkinAnimationProperties)
        * #3 Embed Block (SkinMeshDataProperties)
            * #4 Primitive Field
            * #4 Compound/Vectorial Field
            * #4 Optional Field
            * #3 Collection Block (MaterialOverride)
        * #3 Collection Block (IdleParticlesEffects)
        * #3 Graph Link (mContextualActionData / mResourceResolver)
        * #3 Collection Block (PersistentEffectConditions)
            * #3 Pointer Node (IsAnimationPlayingDynamicMaterialBoolDriver)
    * #2 VFX Definition Root (VfxSystemDefinitionData - Zac Q, W, E, R, Hashes, etc.)
        * #3 Collection Block (ComplexEmitterDefinitionData / SimpleEmitterDefinitionData)
            * #3 Embed Block (VfxEmitterDefinitionData)
                * #4 Primitive Field
                * #4 Compound/Vectorial Field
                * #4 Optional Field
                * #3 Pointer Node (Dynamics / ProbabilityTables)
                * #3 Pointer Node (Primitive Mesh / Beam / Quad)
                * #3 Pointer Node (ReflectionDefinition / FlexShapeDefinition)
    * #2 Root Entry (ResourceResolver)
        * #3 Collection Block (ResourceMap)
            * #4 Primitive Field
    * #2 Root Entry (AnimationGraphData)
        * #3 Collection Block (mClipDataMap)
            * #3 Pointer Node (AtomicClipData / SequencerClipData / SelectorClipData)
                * #4 Primitive Field
                * #3 Collection Block (mEventDataMap)
        * #3 Collection Block (mMaskDataMap)
            * #3 Embed Block (MaskData)
                * #4 Primitive Field
        * #3 Collection Block (mTrackDataMap)
            * #3 Embed Block (TrackData)
                * #4 Primitive Field
        * #3 Collection Block (mBlendDataTable)
            * #3 Pointer Node (TimeBlendData / TransitionClipBlendData)
                * #4 Primitive Field

---

### Nomenclatura de Conjuntos

* #1 Classes
    * #2 Entidades (Character Base - Zac Skin0)
        * #3 Estruturas Internas (SkinAudioProperties, SkinMeshProperties, PersistentEffectConditions)
            * #4 Parâmetros (ChampionSkinName, SkinScale, FresnelColor, Texture)
    * #2 Entidades (VFX Systems - Zac_Base_Q, E_Moving, my_morgana_poca, etc.)
        * #3 Estruturas Internas (EmitterDefinition, FlexShapeDefinition, VfxReflectionDefinition)
            * #4 Parâmetros (Rate, ParticleLifetime, BirthVelocity, Color, BirthScale0)
    * #2 Entidades (Resources)
        * #3 Estruturas Internas (ResourceMap)
            * #4 Parâmetros (ParticlePaths, AnimationPaths)
    * #2 Entidades (Animation Graph)
        * #3 Estruturas Internas (ClipDataMap, MaskDataMap, BlendDataTable)
            * #4 Parâmetros (mAnimationFilePath, mProbability, mTickDuration, mTime)