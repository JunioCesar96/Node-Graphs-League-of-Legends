import type { HTMLAttributes, KeyboardEvent } from 'react'

import type { CanvasNode } from '@/core/canvasScene'

import styles from './NodeInspector.module.css'

type NodeInspectorProps = {
  canDelete: boolean
  dragHandleProps: HTMLAttributes<HTMLElement>
  minimized: boolean
  node: CanvasNode
  onDelete: () => void
  onToggleMinimized: () => void
  onUpdateParameter: (parameterId: string, value: string) => void
}

function getParameterValue(node: CanvasNode, parameterId: string, fallback: string) {
  return node.node.values.find((value) => value.parameterId === parameterId)?.value ?? fallback
}

export function NodeInspector({
  dragHandleProps,
  canDelete,
  minimized,
  node,
  onDelete,
  onToggleMinimized,
  onUpdateParameter,
}: NodeInspectorProps) {
  const commitParameter = (parameterId: string, value: string) => {
    onUpdateParameter(parameterId, value)
  }

  const handleParameterKeyDown = (event: KeyboardEvent<HTMLInputElement>, parameterId: string) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }

    if (event.key === 'Escape') {
      const parameter = node.node.schema.parameters.find((currentParameter) => currentParameter.id === parameterId)

      if (parameter) {
        event.currentTarget.value = getParameterValue(node, parameterId, parameter.defaultValue)
      }

      event.currentTarget.blur()
    }
  }

  if (minimized) {
    return (
      <button
        aria-label="Expand selected node inspector"
        className={styles.minimized}
        onClick={onToggleMinimized}
        {...dragHandleProps}
        type="button"
      >
        <span className={styles.minimizedIcon}>S</span>
        <span className={styles.minimizedText}>Selected Node</span>
      </button>
    )
  }

  return (
    <aside className={styles.panel} aria-label="Selected node inspector">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow} {...dragHandleProps}>
            Selected Node
          </span>
          <h2 className={styles.title}>{node.node.schema.title}</h2>
        </div>
        <button
          aria-label="Minimize selected node inspector"
          className={styles.toggle}
          onClick={onToggleMinimized}
          type="button"
        >
          -
        </button>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className={styles.label}>instance</span>
          <span className={styles.value}>{node.node.id}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.label}>position</span>
          <span className={styles.value}>
            {node.position.x}, {node.position.y}
          </span>
        </span>
      </div>

      <div className={styles.actions}>
        <button disabled={!canDelete} onClick={onDelete} type="button">
          Delete node
        </button>
      </div>

      <section className={styles.section} aria-labelledby="inspector-parameters">
        <h3 className={styles.sectionTitle} id="inspector-parameters">
          Parameters
        </h3>
        <ul className={styles.list}>
          {node.node.schema.parameters.map((parameter) => (
            <li className={styles.listItem} key={parameter.id}>
              <span className={styles.name}>{parameter.name}</span>
              <label className={styles.parameterEditor}>
                <span className={styles.type}>{parameter.type}</span>
                <input
                  aria-label={`${parameter.name} value`}
                  defaultValue={getParameterValue(node, parameter.id, parameter.defaultValue)}
                  key={`${node.id}:${parameter.id}:${getParameterValue(node, parameter.id, parameter.defaultValue)}`}
                  onBlur={(event) => commitParameter(parameter.id, event.target.value)}
                  onKeyDown={(event) => handleParameterKeyDown(event, parameter.id)}
                />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="inspector-entities">
        <h3 className={styles.sectionTitle} id="inspector-entities">
          Entities
        </h3>
        <ul className={styles.list}>
          {node.node.schema.entities.map((entity) => (
            <li className={styles.listItem} key={entity.id}>
              <span className={styles.name}>{entity.name}</span>
              <span className={styles.type}>{entity.schemaId}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
