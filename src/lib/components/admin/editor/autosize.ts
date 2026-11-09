/** Grows a textarea with its content. */
export const autosize = (el: HTMLTextAreaElement) => {
  const fit = () => {
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }
  fit()
  el.addEventListener("input", fit)
  const ro = new ResizeObserver(() => fit())
  ro.observe(el)
  return {
    destroy: () => (el.removeEventListener("input", fit), ro.disconnect()),
  }
}
