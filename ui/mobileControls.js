export class MobileControls {
    constructor(controls) {
        this.controls = controls;
        this.container = document.getElementById('ui-container');
        this.createJoystick();
        this.createButtons();
        this.setupTouchRotation();
    }

    createJoystick() {
        const joyContainer = document.createElement('div');
        joyContainer.className = 'joystick';
        joyContainer.style.cssText = `
            position: absolute;
            bottom: 40px;
            left: 40px;
            width: 120px;
            height: 120px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            pointer-events: auto;
        `;
        
        const knob = document.createElement('div');
        knob.style.cssText = `
            width: 50px;
            height: 50px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            pointer-events: none;
        `;
        
        joyContainer.appendChild(knob);
        this.container.appendChild(joyContainer);

        let joyTouchId = null;

        const handleTouch = (e) => {
            if (joyTouchId === null) return;
            
            // Prevent default to stop scrolling/zooming while using joystick
            if (e.cancelable) e.preventDefault();

            let touch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === joyTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
            if (!touch) return;

            const rect = joyContainer.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 50; // Smaller max dist for better control
            
            if (dist > maxDist) {
                dx *= maxDist / dist;
                dy *= maxDist / dist;
            }
            
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            this.controls.joystickPos = { x: dx / maxDist, y: dy / maxDist };
        };

        joyContainer.addEventListener('touchstart', (e) => {
            if (joyTouchId === null) {
                joyTouchId = e.changedTouches[0].identifier;
                handleTouch(e);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (joyTouchId !== null) {
                handleTouch(e);
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === joyTouchId) {
                    joyTouchId = null;
                    knob.style.transform = 'translate(0, 0)';
                    this.controls.joystickPos = { x: 0, y: 0 };
                    break;
                }
            }
        }, { passive: false });
    }

    createButtons() {
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            position: absolute;
            bottom: 40px;
            right: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            z-index: 100;
        `;

        const createBtn = (text, action) => {
            const btn = document.createElement('div');
            btn.className = 'mobile-btn';
            btn.style.cssText = `
                width: 80px;
                height: 80px;
                background: rgba(255,255,255,0.2);
                border: 2px solid rgba(255,255,255,0.4);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
                user-select: none;
                -webkit-tap-highlight-color: transparent;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            `;
            btn.textContent = text;
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.style.background = 'rgba(255,255,255,0.5)';
                btn.style.transform = 'scale(0.9)';
                action(true);
            }, { passive: false });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.style.background = 'rgba(255,255,255,0.2)';
                btn.style.transform = 'scale(1.0)';
                action(false);
            }, { passive: false });
            
            return btn;
        };

        const jumpBtn = createBtn('JUMP', (val) => {
            this.controls.isJumping = val;
        });
        const breakBtn = createBtn('BRK', (val) => { 
            if(val) window.dispatchEvent(new CustomEvent('game-break'));
        });
        const placeBtn = createBtn('PLC', (val) => { 
            if(val) window.dispatchEvent(new CustomEvent('game-place'));
        });

        btnContainer.appendChild(breakBtn);
        btnContainer.appendChild(placeBtn);
        const spacer = document.createElement('div');
        btnContainer.appendChild(spacer);
        btnContainer.appendChild(jumpBtn);
        
        this.container.appendChild(btnContainer);
    }

    setupTouchRotation() {
        let lastTouch = null;
        let touchId = null;

        window.addEventListener('touchstart', (e) => {
            // Only start rotation if touch is on the right half of the screen
            // and NOT on a button or joystick
            if (e.target.closest('.mobile-btn') || e.target.closest('.joystick')) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.clientX > window.innerWidth / 2) {
                    // Check if we already have a rotation touch
                    if (touchId === null) {
                        lastTouch = { x: touch.clientX, y: touch.clientY };
                        touchId = touch.identifier;
                    }
                }
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (touchId !== null) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === touchId) {
                        const dx = touch.clientX - lastTouch.x;
                        const dy = touch.clientY - lastTouch.y;
                        
                        this.controls.rotation.y -= dx * this.controls.touchSensitivity;
                        this.controls.rotation.x -= dy * this.controls.touchSensitivity;
                        this.controls.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.controls.rotation.x));
                        
                        lastTouch = { x: touch.clientX, y: touch.clientY };
                        break;
                    }
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    lastTouch = null;
                    break;
                }
            }
        }, { passive: true });
    }
}
