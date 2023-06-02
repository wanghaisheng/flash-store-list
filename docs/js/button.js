const triggerKeydownEvent = e => window.dispatchEvent(new KeyboardEvent('keydown', e));
const triggerKeyupEvent = e => window.dispatchEvent(new KeyboardEvent('keyup', e));
export default ({ mappings, label }) => {
    const button = document.createElement('div');
    button.className = `button button-${label.toLowerCase()}`;
    button.textContent = label;
    document.body.appendChild(button);
    const end = () => {
        button.classList.remove('focus');
        mappings.forEach(triggerKeyupEvent);
    };
    const start = (event) => {
        const { clientX, clientY } = event;
        const { offsetLeft: x, offsetTop: y, offsetWidth: w, offsetHeight: h } = button;
        if (clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h) {
            button.classList.add('focus');
            button.setPointerCapture(event.pointerId);
            mappings.forEach(triggerKeydownEvent);
            button.onpointerup = end;
        }
    };
    document.addEventListener('pointerdown', start);
}
