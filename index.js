const { Bodies, Body, Composite, Engine, Events, Mouse, MouseConstraint, Render, Runner } = Matter;

const rnd = (n) => Math.floor(Math.random() * n);

const targetAspect = 640 / 960; // 維持したい比率 (例: 16:9)

function getDimensions() {
  let width = document.documentElement.clientWidth;
  let height = document.documentElement.clientHeight;
  const currentAspect = width / height;

  if (currentAspect > targetAspect) {
    // 画面が横に長すぎる場合、高さを基準に幅を制限
    width = height * targetAspect;
  } else {
    // 画面が縦に長すぎる場合、幅を基準に高さを制限
    height = width / targetAspect;
  }
  return { width, height };
}

// const height = document.documentElement.clientHeight - 5;
// const width = height * 640 / 960;
// const width = document.documentElement.clientWidth - 5;
// const height = width * 960 / 640;
const { width, height } = getDimensions();
const spanX = (n) => { return Math.floor(n * width / 12); }
const spanY = (n) => { return Math.floor(n * height / 12); }

// ボール配列
const balls = [];
// ボールの大きさ
const sizes = [];
let size = spanY(3);
for (let i = 1; i <= 10; i++) {
  const r = Math.sqrt(size);
  const color = `hsl(${i / 10 * 360},90%,50%)`
  sizes.push({ r, color });
  size *= 2;
}

// ボールの大きさを決める 次とその次
const nexts = [0,1];
const next_level = () => {
  const n0 = nexts.shift();
  nexts.push(rnd(sizes.length / 4));
  return n0;
};

// 2点間の距離計算
const distance = (p1, p2) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return len;
};

const drawWorld = (g, bodies) => {
  for (const body of bodies) {
    if (body.label == "Rectangle Body") {
      g.beginPath();
      const v = body.vertices;
      g.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) {
        g.lineTo(v[i].x, v[i].y);
      }
      g.closePath();
      g.fill();
    } else if (body.label == "Circle Body") {
      const x = body.position.x;
      const y = body.position.y;
      const r = body.circleRadius;
      g.beginPath();
      g.arc(x, y, r, 0, 2 * Math.PI);
      g.closePath();
      g.fill();
    }
  }
}

const engine = Engine.create();
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
    }
});

// 枠をつくる
const world = engine.world;
Composite.add(world, [
    Bodies.rectangle(spanX(1), spanY(6), spanX(2) - spanX(1), spanY(11), { isStatic: true }),
    Bodies.rectangle(spanX(11), spanY(6), spanX(2) - spanX(1), spanY(11), { isStatic: true }),
    Bodies.rectangle(spanX(6), spanY(11), spanX(11), spanY(2) - spanY(1), { isStatic: true })
]);

// add mouse control
const mouse = Mouse.create(render.canvas);
var mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false
    }
  }
});
Composite.add(world, mouseConstraint);

var cursor, next_ball;
const putCursor = () => {
  var x = spanX(6);
  if(cursor){
    // because changing cursor size(radius) didn't work properly, remove and add again.
    x = cursor.position.x;
    Composite.remove(world, cursor);
    Composite.remove(world, next_ball);
  }
  cursor = Bodies.circle(x, spanY(1), sizes[nexts[0]].r, {
    isStatic: true,
  });
  cursor.render.fillStyle = sizes[nexts[0]].color;
  cursor.collisionFilter = {
    group: -1,
  };
  Composite.add(world, cursor);
  next_ball = Bodies.circle(spanX(11), spanY(1), sizes[nexts[1]].r, {
    isStatic: true,
  });
  next_ball.render.fillStyle = sizes[nexts[1]].color;
  next_ball.collisionFilter = {
    group: -1,
  };
  Composite.add(world, next_ball);
};
putCursor(); // Initialize

Events.on(mouseConstraint, 'mouseup', function(event) {
  var mousePosition = event.mouse.position;
  const options = {
      friction: 1,
      frictionAir: 0.03,
      density: .001, // 密度
      restitution: 0.1, // 反発係数
    };
  const level = next_level();
  const w = sizes[level].r;
  const c = Bodies.circle(mousePosition.x, 50, w, options)
  c.render.fillStyle = sizes[level].color;
  c.level = level;
  Composite.add(world, c);
  balls.push(c);
  // update cursor(next ball)
  putCursor();
});

Events.on(mouseConstraint, 'mousemove', function(event) {
  const x = event.mouse.position.x;
  //if (x < 200 || x > 500) return;
  cursor.position.x = x;
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// setInterval(() => {
//   // 同サイズのくっついていたら合体
//   const newballs = [];  
//   for (let i = 0; i < balls.length - 1; i++) {
//     const b1 = balls[i];
//     if (!b1) continue;
//     for (let j = i + 1; j < balls.length; j++) {
//       const b2 = balls[j];
//       if (!b2) continue;
//       if (b1.level == b2.level && distance(b1.position, b2.position) <= b1.circleRadius * 2.01) {
//         balls[j] = null;
//         balls[i] = null;
//         Composite.remove(world, b1);
//         Composite.remove(world, b2);
//         const nt = sizes[b1.level + 1];
//         if (nt) {
//           const x = (b1.position.x + b2.position.x) / 2;
//           const y = (b1.position.y + b2.position.y) / 2;
//           const w = nt.r;
//           const b = Bodies.circle(x, y, w);
//           b.render.fillStyle = nt.color;
//           b.size = w;
//           b.level = b1.level + 1;
//           newballs.push(b);
//         }
//         break;
//       }
//     }
//   }
//   for (let i = 0; i < balls.length; i++) {
//     if (!balls[i]) {
//       balls.splice(i, 1);
//       i--;
//     }
//   }
//   for (const b of newballs) {
//     balls.push(b);
//     Composite.add(world,b);
//   }
// }, 1000 / 4);
