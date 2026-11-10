// Retour haptique léger, quand l'appareil le permet.
// Android : navigator.vibrate. iOS (17.4+) : basculer un interrupteur natif caché
// déclenche le petit "tic" du système ; ailleurs, il ne se passe simplement rien.

let label: HTMLLabelElement | null = null

export function haptic() {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(8)
      return
    }
    if (!label) {
      label = document.createElement('label')
      label.setAttribute('aria-hidden', 'true')
      label.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0;pointer-events:none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.tabIndex = -1
      label.appendChild(input)
      document.body.appendChild(label)
    }
    label.click()
  } catch {
    /* non supporté */
  }
}
