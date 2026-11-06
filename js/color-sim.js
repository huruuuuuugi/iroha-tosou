// =========================================================
// ★JS② 色見本
// チップを押すと、家の外壁（SVGの #wall）と垂れの色が変わる
// =========================================================

// 1. 色のデータを配列にまとめる
//    文言や色を変えたいときは、ここだけ直せばよい
const colors = [
  { name: 'ウォームホワイト', hex: '#F2EEE6', desc: '明るく清潔感。どんな屋根にも合う定番' },
  { name: 'アイボリー',       hex: '#EDE3CC', desc: 'やわらかく、あたたかい印象に' },
  { name: 'ベージュ',         hex: '#D8C7A8', desc: '汚れが目立ちにくく、街なみになじむ' },
  { name: 'グレージュ',       hex: '#B7AFA3', desc: '落ち着いた、いまどきの人気色' },
  { name: 'ライトグレー',     hex: '#C9CBCC', desc: 'すっきり上品。モダンな家に' },
  { name: 'チャコール',       hex: '#4A4C4E', desc: '重厚感があり、引き締まった印象に' },
  { name: 'ネイビー',         hex: '#2F3E55', desc: '深みのある色で、個性と品を両立' },
  { name: 'モスグリーン',     hex: '#7A8263', desc: '庭の緑と相性がよく、自然な雰囲気に' },
];

// 2. 使う要素を先に取得しておく
const section  = document.querySelector('#color');
const chipList = section.querySelector('.color__chips');
const wall     = section.querySelector('#wall');
const nameEl   = section.querySelector('.color__name');
const descEl   = section.querySelector('.color__desc');
const consultLink = section.querySelector('.color__button');

// 3. 配列からチップ（button）を作って並べる
colors.forEach((color, index) => {
  const li = document.createElement('li');
  const button = document.createElement('button');

  button.type = 'button';
  button.className = 'color__chip';
  button.style.setProperty('--chip-color', color.hex); // CSS側で背景色に使う
  button.setAttribute('aria-label', color.name);        // 色だけでは伝わらないので名前を読み上げさせる
  button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false'); // 最初はウォームホワイトを選択中に

  // 押されたら、その色を選ぶ
  button.addEventListener('click', () => selectColor(color, button));

  li.appendChild(button);
  chipList.appendChild(li);
});

// 4. 色を選んだときの処理
function selectColor(color, selectedButton) {
  // 外壁の塗りを書き換える
  wall.setAttribute('fill', color.hex);

  // 垂れはCSS変数 --drip-color を見ているので、セクションに上書きするだけで色が変わる
  section.style.setProperty('--drip-color', color.hex);

  // 色名と特徴テキストを書き換える（aria-live で読み上げられる）
  nameEl.textContent = color.name;
  descEl.textContent = color.desc;

  // 「この色で相談する」のリンク先に、選んだ色の名前を付ける（例：contact.html?color=ネイビー）
  // encodeURIComponent は、日本語をURLで安全に使える形に変換する
  consultLink.href = `contact.html?color=${encodeURIComponent(color.name)}`;

  // 選択中の状態を付け替える：全部 false にしてから、押したものだけ true
  chipList.querySelectorAll('.color__chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
  });
  selectedButton.setAttribute('aria-pressed', 'true');
}

// 5. 最初の表示をデータとそろえる
selectColor(colors[0], chipList.querySelector('.color__chip'));
