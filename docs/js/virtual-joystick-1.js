window.customElements.define('virtual-joystick', class VirtualJoystick extends HTMLElement {
    static #style = `
        :host {
            --radius: 65px;
            --size: calc(var(--radius) * 2);
        }
        :host,
        slot {
            position: relative;
            display: block;
            width: var(--size);
            height: var(--size);
        }
        slot {
            --x: var(--radius);
            --y: var(--radius);
            border: 1px solid gray;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            box-sizing: border-box;
            transition: opacity 1s, background-color .2s;
            &[part*="active"] {
                background-color: rgba(255, 255, 255, 0.6);
                &:after {
                    background-color: rgba(255, 255, 255, 0.8);
                    transition: transform .1s, background-color 0.2s;
                }
            }
            &:after,
            &:before {
                content: "";
                display: block;
                position: absolute;
                box-sizing: border-box;
                border-radius: 50%;
                width: 50px;
                height: 50px;
            }
            &:after {
                border: 1px solid gray;
                background-color: rgba(255, 255, 255, 0.5);
                transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)));
                transition: transform .4s, background-color .2s;
            }
            &:before {
                border: 1px solid rgb(139, 139, 139);
                transform: translate(calc(-50% + var(--radius)), calc(-50% + var(--radius)));
            }
        }
        [part*="dynamic"] {
            opacity: 0;
        }
        [part*="active"] {
            opacity: 1;
        }
        [part*="box"]:after  {
            transform: translate(calc(-50% + clamp(0px, var(--x), var(--size))), calc(-50% + clamp(0px, var(--y), var(--size))));
        }
    `
    static #getDir = (degree) => {
        const dirs = ['ne', 'n', 'nw', 'w', 'sw', 's', 'se'];
        const acute = 45;
        let treshold = 22.5;
        for (let dir of dirs) {
            if (degree >= treshold && degree < (treshold += acute)) {
                return dir;
            }
        }
        return 'e';
    }
    static #getUniqueDir(a = '', b = '') {
        let dir = '';
        if (a.includes(b[0]) === false) {
            dir = b[0]; 
        }
        if (b[1] && a.includes(b[1]) === false) {
            dir += b;
        }
        return dir;
    }
    #down = () => this.dispatchEvent(new CustomEvent('joystickdown'))
    #move = () => this.dispatchEvent(new CustomEvent('joystickmove'))
    #up = () => this.dispatchEvent(new CustomEvent('joystickup'))
    #setXY(x, y) {
        this.#element.style.setProperty('--x', `${x}px`);
        this.#element.style.setProperty('--y', `${y}px`);
    };
    #calcCrow({ clientX, clientY }) {
        const { lock } = this.dataset;
        this.#rect = this.#element.getBoundingClientRect();
        const dx = lock === 'x' ? this.#r : clientX - this.#rect.left;
        const dy = lock === 'y' ? this.#r : clientY - this.#rect.top;
        const dxr = dx - this.#r;
        const dyr = dy - this.#r;
        const hypot = Math.hypot(dxr, dyr);
        return { dx, dy, dxr, dyr, hypot };
    }
    #log({
        degree = 0,
        force = 0,
        radian = 0,
        distance = 0,
        direction = '',
        hypot = 0,
        capture = '',
        release = '',
        x = this.#rect.width + this.#rect.left,
        y = this.#rect.top + this.#rect.top,
    }) {
        Object.assign(
            this.dataset,
            { degree, force, radian, distance, direction, hypot, capture, release, x, y }
        );
    }
   #isInside(event) {
        const { clientX, clientY } = event;
        const {
            left: x,
            top: y,
            width: w,
            height: h
        } = this.dataset.mode ? this.getBoundingClientRect() : this.#rect;
        const inside = clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h;
        return inside;
    }
    #r = 0
    #element = null
    #rect = null
    constructor() {
        super();
        let output = {};
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>${VirtualJoystick.#style}</style>
            <slot part="joystick"></slot>
        `;
        this.#element = this.shadowRoot.lastElementChild;
        if (this.dataset.mode === 'semi' || this.dataset.mode === 'dynamic') {
            this.#element.part.add('dynamic');
            output = { x: 0, y: 0 };
        }
        if (this.dataset.shape) {
            this.#element.part.add('box');
        }
        this.#rect = this.#element.getBoundingClientRect();
        this.#r = this.#rect.width / 2;
        this.#log(output);
    }
    connectedCallback() {
        document.addEventListener('pointerdown', this.#start);
    }
    #start = (event) => {
        let crow;
        const { clientX, clientY } = event;
        const attachEvents = () => {
            this.#element.part.add('active');
            this.#element.setPointerCapture(event.pointerId);
            this.#bind(event, crow, this.#down);
            this.#element.onpointermove = this.#bind;
            this.#element.onpointerup = this.#end;
        };
        if (this.#element.part.contains('active')) {
            return;
        }
        this.#rect = this.#element.getBoundingClientRect();
        if (this.#isInside(event)) {
            if (this.dataset.mode) {
                if (this.dataset.mode !== 'fixed') {
                    if (this.dataset.mode === 'semi') {
                        this.#element.part.remove('dynamic');
                    }
                    const { top, left } = this.getBoundingClientRect();
                    this.#element.style.left = `${clientX - left - this.#r}px`;
                    this.#element.style.top = `${clientY - top - this.#r}px`;
                }
                crow = this.#calcCrow(event);
                return attachEvents();
            }
            crow = this.#calcCrow(event);
            if (crow.hypot <= this.#r || this.dataset.shape) {
                attachEvents();
            }
        }
    }
    #bind = (event, { dx, dy, dxr, dyr, hypot } = this.#calcCrow(event), cb = this.#move) => {
        const r = this.#r;
        const angle = Math.atan2(dyr, dxr);
        let degree = angle * 180 / Math.PI;
        let x = dx;
        let y = dy;
        if (!this.dataset.shape && hypot > r) {
            x = r * Math.cos(angle) + r;
            y = r * Math.sin(angle) + r;
        }
        degree = (degree > 0 ? 360 : 0) - degree;
        const direction = VirtualJoystick.#getDir(degree);
        this.#log({
            hypot,
            degree,
            direction,
            capture: VirtualJoystick.#getUniqueDir(this.dataset.direction, direction),
            release: VirtualJoystick.#getUniqueDir(direction, this.dataset.direction),
            x: x + this.#rect.left,
            y: y + this.#rect.top,
            radian: (angle > 0 ? 2 * Math.PI : 0) - angle,
            distance: Math.min(hypot, r),
            force: hypot / r,
        });
        this.#setXY(x, y);
        cb();
    };
    #end = () => {
        this.#element.part.remove('active');
        this.#log({ release: this.dataset.direction });
        this.#setXY(this.#r, this.#r);
        this.#element.onpointerup = this.#element.onpointermove = null;
        this.#up();
    };
});
