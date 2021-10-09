const divs = [...document.querySelectorAll('div')];

const TOUCH_EVENTS = new Set(['touchstart', 'touchmove', 'touchend']);
const mouseOrTouch = e => {
  const a =   TOUCH_EVENTS.has(e.type) && typeof e.touches[0] === 'object'
  ? e.touches[0]
  : e;

  return [a.clientX || 0, a.clientY || 0];
};
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

function Element(dom, hasTransitions) {
  let rect;
  const state = {
    hidden: false,
    offsetX: 0,
    offsetY: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0
  }

  function updateRect() {
    rect = dom.getBoundingClientRect();
    state.offsetX = rect.width / 2;
    state.offsetY = rect.height / 2;
    state.x = rect.left + state.offsetX;
    state.y = rect.top + state.offsetY;
  }

  function setStateNum(key, value) {
    state[key] = typeof value === 'number' ? value : state[key];
  }

  updateRect();
  return {
    get isElement() {
      return true;
    },
    get hidden() {
      return state.hidden;
    },
    set hidden(h) {
      const bh = Boolean(h);
      if (state.hidden === bh) return;

      state.hidden = bh;
      if (state.hidden) {
        dom.style.opacity = 0;
        if (hasTransitions) {
          dom.style.transition = '.2s ease-out';
          dom.style.transform = 'scale3d(1.1, 1.1, 1)';
        }
      } else {
        dom.style.opacity = 1;
        if (hasTransitions) {
          dom.style.transition = 'none';
          dom.style.transform = null;
        }
      }
    },
    get height() {
      return rect && rect.height || 0;
    },
    get width() {
      return rect && rect.width || 0;
    },
    get x() {
      return state.x;
    },
    set x(_x) {
      setStateNum('x', _x);
    },
    get y() {
      return state.y;
    },
    set y(_y) {
      setStateNum('y', _y);
    },
    get vx() {
      return state.vx;
    },
    set vx(_vx) {
      setStateNum('vx', _vx);
    },
    get vy() {
      return state.vy;
    },
    set vy(_vy) {
      setStateNum('vy', _vy);
    },
    get offsetX() {
      return state.offsetX;
    },
    get offsetY() {
      return state.offsetY;
    },
    get dom() {
      return dom;
    },
    copyPosition(elem) {
      if (!elem.isElement) return;
      state.x = elem.x;
      state.y = elem.y;
    },
    update() {
      state.x += state.vx;
      state.y += state.vy;

      const tx = state.x - state.offsetX;
      const ty = state.y - state.offsetY;
      dom.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    },
    updateRect
  }
}

function collide(cir, box) {
  const dx = cir.x - clamp(cir.x, box.x - box.offsetX, box.x + box.offsetX);
  const dy = cir.y - clamp(cir.y, box.y - box.offsetY, box.y + box.offsetY);
  return {
    contact: dx**2 + dy**2 < cir.offsetX**2,
    dx,
    dy
  };
}

const GLOBAL = {
  W: window.innerWidth,
  H: window.innerHeight,
  playerX: window.innerWidth / 2,
  win: false
}

const player = Element(divs[3]);
const ball = Element(divs[0]);
const trail1 = Element(divs[1]);
const trail2 = Element(divs[2]);
const blocks = divs.slice(4).map(d => Element(d, true));

player.y = GLOBAL.H - 16;
function resetBall() {
  ball.y = trail1.y = trail2.y = GLOBAL.H - 32;
  ball.x = trail1.x = trail2.x = .5 * GLOBAL.W;
  ball.vx = 3;
  ball.vy = -3;
}
function reset() {
  GLOBAL.win = false;
  document.body.className = '';
  document.body.setAttribute('data-lives', 2); 

  resetBall();
  player.hidden = false;
  ball.hidden = false;
  trail1.hidden = false;
  trail2.hidden = false;
  blocks.forEach(b => b.hidden = false);
}
reset();

function handleMove(e) {
  GLOBAL.playerX = mouseOrTouch(e)[0];
}
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove);

function handleResize() {
  GLOBAL.W = window.innerWidth;
  GLOBAL.H = window.innerHeight;
  player.y = GLOBAL.H - 16;
  blocks.forEach(b => b.updateRect());
}
window.addEventListener('resize', handleResize);

function handleClick() {
  if (GLOBAL.win) {
    reset();
  }
}
window.addEventListener('click', handleClick);
window.addEventListener('touchstart', handleClick);

function play(t) {
  requestAnimationFrame(play);
  const { W, H, playerX, win } = GLOBAL;
  
  if (win) {
    player.hidden = true;
    ball.hidden = true;
    trail1.hidden = true;
    trail2.hidden = true;
    document.body.className = 'win';

    return;
  };

  // player position. constrain to viewport
  player.x =
    Math.min(Math.max(playerX, player.offsetX), W - player.offsetX);

  // block collisions
  let count = 0;
  blocks.forEach(b => {
    if (b.hidden) {
      count += 1;
      if (count === blocks.length) {
        GLOBAL.win = true;
      }
      return;
    };
    const { contact, dx, dy } = collide(ball, b);
    if (contact) {
      // determine if hitting x or y sides of rect
      if (Math.abs(dx) < Math.abs(dy)) {
        ball.vy *= -1;
      } else {
        ball.vx *= -1;
      }
      b.hidden = true;
    }
  });

  // ball, side wall collisions
  if (ball.x + ball.vx > W - ball.offsetX) {
    ball.vx = -Math.abs(ball.vx);
  } else if (ball.x + ball.vx < ball.width / 2) {
    ball.vx = Math.abs(ball.vx);
  }

  if (ball.y + ball.vy < ball.offsetY) {
    // ball top wall collision
    ball.vy = Math.abs(ball.vy);
  } else if (collide(ball, player).contact) {
    // ball player collision
    ball.vy = -Math.abs(ball.vy);
    // ball x velocity based on where it hits player
    ball.vx = 8 * ((ball.x - player.x) / player.offsetX);
  } else if (ball.y + ball.vy > H - ball.offsetY) {
    // ball bottom wall collision, gameover
    let lives = document.body.getAttribute('data-lives');
    lives -= 1;
    if (lives < 0) {
      reset();
    } else {
      resetBall();
      document.body.setAttribute('data-lives', lives)
    }
  }

  // motion trails
  trail2.copyPosition(trail1);
  trail1.copyPosition(ball);

  player.update();
  ball.update();
  trail1.update();
  trail2.update();
}
play(0);