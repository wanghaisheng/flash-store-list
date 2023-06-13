const { pathname } = window.location;
await navigator.serviceWorker.register('../../sw.js');
const response = await fetch(`${pathname}game.json`);
const { controls, aspectRatio } = response.status === 200 ? await response.json?.() : {};
window.RufflePlayer = window.RufflePlayer || {};
const $playground = document.querySelector('.playground');
const $playButton = document.querySelector('.play-button')
const $controls = document.querySelector('.controls');
const launchGame = () => {
    document.body.classList.add('run');
    $playground.onclick = null;
};
const insertPlayer = () => {
    $playground.prepend(player);
    player.load(`${pathname}/game.swf`);
}
$playground.onclick = launchGame;
$playground.style.aspectRatio = aspectRatio || '64/48';
document.querySelector('.button-close').onclick = (event) => {
    event.preventDefault();
    document.body.classList.remove('run');
    player.remove();
    $playground.onclick = () => {
        launchGame();
        insertPlayer();
    };
}
const ruffle = window.RufflePlayer.newest();
const player = ruffle.createPlayer();
player.config = {
    autoplay: 'on',
    contextMenu: 'rightClickOnly',
};
const triggerKeydownEvent = event => window.dispatchEvent(new KeyboardEvent('keydown', event));
const triggerKeyupEvent = event => window.dispatchEvent(new KeyboardEvent('keyup', event));
insertPlayer();
if (controls?.length) {
    $controls.insertAdjacentHTML('beforeend', '<button type="button" class="button button-toggle-controls"></button>');
    $controls.lastElementChild.onclick = ({ currentTarget }) => {
        currentTarget.classList.toggle('hide-gamepad');
    }
    controls.forEach(async (control) => {
        const { type } = control;
        if ('joystick' === type) {
            const { mappings, dataset } = control;
            const assignMapping = (direction) => {
                const code = mappings[direction];
                console.log(1111, code)
                return typeof code === 'string' ? { code } : code;
            };
            const mapKeydown = direction => triggerKeydownEvent(assignMapping(direction));
            const mapKeyup = direction => triggerKeyupEvent(assignMapping(direction));
            $controls.insertAdjacentHTML('beforeend', '<virtual-joystick></virtual-joystick>');
            const $joystick = $controls.querySelector('virtual-joystick');
            const handleKeyEvents = () => {
                $joystick.dataset.release.split('').forEach(mapKeyup);
                $joystick.dataset.capture.split('').forEach(mapKeydown);
            };
            $joystick.addEventListener('joystickdown', handleKeyEvents);
            $joystick.addEventListener('joystickmove', handleKeyEvents);
            $joystick.addEventListener('joystickup', handleKeyEvents);
            if (dataset) {
                Object.assign($joystick.dataset, dataset);
            }
        }
        if ('button' === type) {
            const Button = await import('./button.js');
            Button.default(control, $controls);
        }
    });
}

