// =========================================================
// スクロールで要素がふわっと現れる（フェードイン）
//
// JSの役割は「画面に入ったらクラスを付ける」ことだけ。
// 動きそのものはCSSに書いている（css/style.css の .fade-in）。
// =========================================================

(() => {
  // 1. 動きを減らす設定の人には演出をしない（最初から全部見える）
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 2. フェードインさせる要素を集める
  //    対象を増やしたいときは、ここにセレクタを足すだけでよい
  const targets = document.querySelectorAll('.reason__item, .works__card');

  // 3. 見ているのが「画面に入ったか」だけなので、scrollイベントより軽い IntersectionObserver を使う
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('is-visible');

      // 一度現れたら監視をやめる。スクロールで戻っても、もう消えない
      observer.unobserve(entry.target);
    });
  }, {
    // 画面の下端より少し上に入ってから動かす。下端ぎりぎりだと動きが見えにくい
    rootMargin: '0px 0px -10% 0px',
  });

  // 4. 隠す準備のクラスはJSで付ける
  //    HTMLに直接書くと、JSが動かない環境で要素が見えないままになってしまう
  targets.forEach((target) => {
    target.classList.add('fade-in');
    observer.observe(target);
  });
})();
