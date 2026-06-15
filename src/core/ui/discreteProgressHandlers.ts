export type DiscreteProgressHandlers = {
  onConfirmYes?: () => void
  onConfirmNo?: () => void
  onDismiss?: () => void
  onCancelRequest?: () => void
}

const handlersByName = new Map<string, DiscreteProgressHandlers>()

export function setDiscreteProgressHandlers(
  name: string,
  handlers: DiscreteProgressHandlers | null,
): void {
  if (!handlers) {
    handlersByName.delete(name)
    return
  }
  handlersByName.set(name, handlers)
}

export function getDiscreteProgressHandlers(name: string): DiscreteProgressHandlers | undefined {
  return handlersByName.get(name)
}
