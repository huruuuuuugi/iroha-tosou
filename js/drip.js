// =========================================================
// ★JS① 液体のように波打つペンキで、ヒーローを塗りつぶす演出
//
// 液体らしさは、3つの動きを重ねて作っている。
//   ゆらぎ：時間とともに、波面がゆっくり揺れ続ける
//   粘り  ：ペンキはスクロールにすぐ追いつかず、少し遅れてとろっと動く
//   余韻  ：動くと波が大きくなり、止まってもゆっくり収まる
//
// 順番：① ヒーローはページと一緒に上へ流れる
//       ② 同時にペンキが下へ流れて、ヒーローを塗りつぶす
//       ③ 塗り終わるころに、メッセージが浮かび上がる
// =========================================================

(() => {
  // 1. 動きを減らす設定の人には演出をしない
  //    （CSSのクラスを付けないので、HTMLに書いた波のまま止まって、全部が見える）
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.addEventListener('change', () => location.reload());
  if (reduceMotion.matches) return;

  // 2. 使う要素を取得する
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const wavePath = document.querySelector('.hero__wave path');

  // 3. 調整用の数字。演出を変えたいときは、ここだけ直せばよい

  // スクロールのタイミング（ヒーローの高さの何割スクロールしたか）
  const PAINT_END    = 0.7;  // ここまでで塗り終わる。小さくすると速く塗られる
  const REVEAL_START = 0.6;  // メッセージが見え始める
  const REVEAL_END   = 0.85; // メッセージが見え終わる

  // 液体の動き
  const WAVE_SPEED   = 0.55; // 揺れの速さ。小さいほどゆっくり
  const WAVE_CALM    = 6;    // 止まっているときの波の大きさ
  const WAVE_ACTIVE  = 18;   // スクロール中に足される波の大きさ
  const VISCOSITY    = 0.1; // 粘り（秒）。大きいほど、遅れてとろっと動く
  const CALM_DOWN    = 1.4;  // 余韻（秒）。大きいほど、波がゆっくり収まる

  // 4. 波の基本の形。ヘッダー下の波を点で表したもの（x, y）。SVGの座標で書いている
  const BASE_SHAPE = [
    [0, 70], [160, 66], [340, 62], [520, 54], [700, 49], [840, 54],
    [1020, 52], [1180, 53], [1300, 65], [1440, 60],
  ];
  const WIDTH = 1440;  // SVGの横幅（viewBoxと同じ）
  const POINTS = 36;   // 波を何個の点で描くか。多いほどなめらか

  // 値を min〜max の範囲に収める
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  // 位置 x での、基本の形の高さを返す（点と点の間は直線でつなぐ）
  function baseY(x) {
    for (let i = 1; i < BASE_SHAPE.length; i += 1) {
      const [x0, y0] = BASE_SHAPE[i - 1];
      const [x1, y1] = BASE_SHAPE[i];
      if (x <= x1) return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
    }
    return BASE_SHAPE[BASE_SHAPE.length - 1][1];
  }

  // 位置 x・時間 time での、波面の揺れを返す。
  // 長さと速さが違う波を3つ足すと、同じ動きの繰り返しに見えなくなる
  function ripple(x, time) {
    const t = time * WAVE_SPEED;
    return Math.sin(x / 230 + t)
      + Math.sin(x / 120 - t * 1.4) * 0.45
      + Math.sin(x / 390 + t * 0.6) * 0.6;
  }

  // 波の形を、SVGのpathの文字列にする
  function buildWavePath(time, amount) {
    const step = WIDTH / POINTS;
    const yAt = (x) => baseY(x) + ripple(x, time) * amount;

    let path = `M 0 0 H ${WIDTH} V ${yAt(WIDTH)} `;
    // 右から左へ、点と点の中間を通る曲線でつなぐ（角が出ずなめらかになる）
    for (let i = POINTS; i > 0; i -= 1) {
      const x = step * i;
      const midX = x - step / 2;
      path += `Q ${x} ${yAt(x)} ${midX} ${(yAt(x) + yAt(x - step)) / 2} `;
    }
    return `${path}L 0 ${yAt(0)} Z`;
  }

  // 5. 毎フレーム変わる値
  let paintY = 0;   // ペンキの今の位置
  let energy = 0;   // 波の勢い（0〜1）。動くと増え、止まると減る
  let lastTime = 0;
  let isHeroVisible = true;
  let isRunning = false; // アニメーションが二重に動かないようにする目印

  // スクロール量から決まる値を更新する
  function updateReveal() {
    const rect = hero.getBoundingClientRect();
    const scrolled = -rect.top / rect.height; // ヒーローの高さの何割スクロールしたか
    const reveal = clamp((scrolled - REVEAL_START) / (REVEAL_END - REVEAL_START));
    root.style.setProperty('--rest-opacity', reveal);
    return { scrolled, height: rect.height };
  }

  // 1フレームぶんの処理
  function animate(timeMs) {
    if (!isHeroVisible) {
      lastTime = 0;
      isRunning = false;
      return; // ヒーローが画面にないときは止めて、無駄な処理をしない
    }

    const time = timeMs / 1000;
    const delta = lastTime ? Math.min(time - lastTime, 0.1) : 0; // 前のフレームからの秒数
    lastTime = time;

    const { scrolled, height } = updateReveal();

    // 粘り：目標の位置へ一気に行かず、毎フレーム少しずつ近づく
    const targetY = height * clamp(scrolled / PAINT_END);
    const previousY = paintY;
    paintY += (targetY - paintY) * (1 - Math.exp(-delta / VISCOSITY));
    root.style.setProperty('--paint-y', `${paintY}px`);

    // 余韻：動いた速さで勢いを増やし、止まったらゆっくり減らす
    const speed = delta ? Math.abs(paintY - previousY) / delta : 0;
    const targetEnergy = clamp(speed / 900);
    const settle = targetEnergy > energy ? 0.2 : CALM_DOWN; // 増えるときは速く、減るときはゆっくり
    energy += (targetEnergy - energy) * (1 - Math.exp(-delta / settle));

    // ゆらぎ：時間と勢いに合わせて、波の形を描き直す
    wavePath.setAttribute('d', buildWavePath(time, WAVE_CALM + WAVE_ACTIVE * energy));

    requestAnimationFrame(animate);
  }

  // 6. 演出を開始する
  root.classList.add('is-paint-ready'); // ここからCSSの演出用スタイルが有効になる

  // ページの途中で読み込み直したときは、ペンキを最初から正しい位置に置く
  const start = updateReveal();
  paintY = start.height * clamp(start.scrolled / PAINT_END);
  root.style.setProperty('--paint-y', `${paintY}px`);

  // アニメーションを開始する（すでに動いていれば何もしない）
  function startAnimation() {
    if (isRunning) return;
    isRunning = true;
    requestAnimationFrame(animate);
  }

  // ヒーローが画面に入ったら動かし、出たら止める
  new IntersectionObserver(([entry]) => {
    isHeroVisible = entry.isIntersecting;
    updateReveal(); // 一気に下へ飛んだときも、メッセージが消えたままにならないようにする
    if (isHeroVisible) startAnimation();
  }).observe(hero);

  // ヒーローが画面にないときも、メッセージの透明度だけは更新する
  window.addEventListener('scroll', updateReveal, { passive: true });
  startAnimation();

  // キーボード操作：ペンキの下にあるボタンへTabで移動したら、見える位置まで戻す
  // focusin はマウスで押したときにも起きる。そこで戻すとボタンがカーソルの下から逃げて
  // クリックが成立しないので、:focus-visible（キーボード操作のとき）だけに絞っている
  hero.addEventListener('focusin', (event) => {
    if (event.target.matches(':focus-visible') && hero.getBoundingClientRect().top < 0) {
      window.scrollTo(0, 0);
    }
  });
})();
