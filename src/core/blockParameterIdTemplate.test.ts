import { describe, expect, it } from 'vitest'



import {

  buildTemplatedParameterId,

  resolveConcreteParameterId,

  templatizeConcreteParameterId,

  templatizeSchemaNodeId,

} from './blockParameterIdTemplate'



describe('buildTemplatedParameterId', () => {

  it('usa template VfxSystemDefinitionData com {particlePath}', () => {

    const concrete =

      'vfx-system-definition-data__entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf_parameter_flags'

    expect(buildTemplatedParameterId('VfxSystemDefinitionData', 'flags', concrete)).toBe(

      'vfx-system-definition-data__entries-{particlePath}_parameter_flags',

    )

  })



  it('usa template VfxEmitterDefinitionData com {particlePath} e {ceddId}', () => {

    const concrete =

      'vfx-emitter-definition-data__main-entries-characters-brand-skins-skin0-particles-brand-base-dance-complex-emitter-definition-data-3_parameter_blendMode'

    expect(buildTemplatedParameterId('VfxEmitterDefinitionData', 'blendMode', concrete)).toBe(

      'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}_parameter_blendMode',

    )

  })



  it('templatiza nó filho com sufixo após ceddId (VfxShapeCylinder)', () => {

    const concrete =

      'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape_parameter_height'

    expect(buildTemplatedParameterId('VfxShapeCylinder', 'height', concrete)).toBe(

      'vfx-shape-cylinder__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-spawn-shape_parameter_height',

    )

  })



  it('normaliza caminho duplicado em main-entries', () => {

    const concrete =

      'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape_parameter_height'

    expect(buildTemplatedParameterId('VfxShapeCylinder', 'height', concrete)).toBe(

      'vfx-shape-cylinder__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-spawn-shape_parameter_height',

    )

  })



  it('templatiza dynamics com sufixo -color-dynamics', () => {

    const concrete =

      'vfx-animated-color-variable-data__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-3-color-dynamics_parameter_values'

    expect(buildTemplatedParameterId('VfxAnimatedColorVariableData', 'values', concrete)).toBe(

      'vfx-animated-color-variable-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-color-dynamics_parameter_values',

    )

  })

})



describe('resolveConcreteParameterId', () => {

  it('expande id curto com schemaId da instância', () => {

    const schemaId =

      'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape'

    expect(

      resolveConcreteParameterId('VfxShapeCylinder_parameter_height', 'height', schemaId),

    ).toBe(`${schemaId}_parameter_height`)

  })

})



describe('templatizeConcreteParameterId', () => {

  it('substitui segmento entries por {particlePath}', () => {

    expect(

      templatizeConcreteParameterId(

        'vfx-system-definition-data__entries-characters-zac-skins-skin0-particles-zac-base-q-tar_parameter_particlePath',

        'particlePath',

      ),

    ).toBe('vfx-system-definition-data__entries-{particlePath}_parameter_particlePath')

  })

})



describe('templatizeSchemaNodeId', () => {

  it('usa template por blockType quando id é curto', () => {

    expect(templatizeSchemaNodeId('VfxEmitterDefinitionData', 'VfxEmitterDefinitionData')).toBe(

      'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}',

    )

  })



  it('usa template VfxSystem para entries', () => {

    expect(

      templatizeSchemaNodeId(

        'vfx-system-definition-data__entries-characters-zac-skins-skin0-particles-zac-base-q-tar',

        'VfxSystemDefinitionData',

      ),

    ).toBe('vfx-system-definition-data__entries-{particlePath}')

  })



  it('preserva sufixo após ceddId no schema.id', () => {

    expect(

      templatizeSchemaNodeId(

        'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape',

        'VfxShapeCylinder',

      ),

    ).toBe(

      'vfx-shape-cylinder__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-spawn-shape',

    )

  })

})


