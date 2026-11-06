// =========================================================
// お見積りフォーム
//
// 1つの <form> の中に画面を4つ並べ、見せる画面だけを切り替えている。
//   1. 必須項目 → 2. 任意項目 → 3. 確認 → 4. 完了
// ページを移動しないので、画面を行き来しても入力内容が消えない。
//
// ※架空の店舗のサイトなので、入力内容はどこにも送信しない。
// =========================================================

(() => {
  // 1. 使う要素を取得する
  const form = document.querySelector('#estimate-form');
  const steps = form.querySelectorAll('.form-step');
  const summary = form.querySelector('#form-summary');
  const colorName = form.querySelector('#color-name');
  const progress = document.querySelector('#form-progress');
  const progressItems = progress.querySelectorAll('.form-progress__item');

  const CONFIRM_STEP = 3;
  const DONE_STEP = 4;

  let currentStep = 1;

  // 入力された値を取り出す。前後の空白は入力ミスなので取り除く
  const textOf = (name) => (form.elements[name].value || '').trim();

  // 電話番号を、数字だけの形にそろえる
  // 案内は「ハイフンなしでOK」だが、付けて入力してもエラーにはしない
  // （全角の「０９０－」や、番号の間の空白もここで取り除く）
  // \p{Pd} は「ダッシュ類すべて」の意味。見た目がハイフンの文字は種類が多いので、まとめて指定している
  const telDigits = () => toHalfWidthDigits(textOf('tel')).replace(/[\p{Pd}−ー\s]/gu, '');

  // 2. 入力チェックのルール。画面ごとに配列でまとめている
  //    field   ：HTMLの data-field と同じ名前（エラーを出す場所）
  //    isValid ：正しければ true を返す関数
  //    message ：正しくないときに出す文章
  const rules = {
    1: [
      {
        field: 'work',
        isValid: () => textOf('work') !== '',
        message: '希望する工事内容を選んでください。',
      },
      {
        field: 'name',
        isValid: () => textOf('familyName') !== '' && textOf('givenName') !== '',
        message: '姓と名を入力してください。',
      },
      {
        field: 'tel',
        // 数字だけにそろえたうえで、10桁か11桁なら正しいとする
        isValid: () => /^\d{10,11}$/.test(telDigits()),
        message: '電話番号を数字で入力してください（例：09012345678）。',
      },
      {
        field: 'city',
        isValid: () => textOf('city') !== '',
        message: '施工場所の市区町村を入力してください。',
      },
    ],
    2: [
      {
        field: 'email',
        // メールは任意。空ならOKで、入力があるときだけ形を確かめる
        isValid: () => textOf('email') === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textOf('email')),
        message: 'メールアドレスの形を確認してください（例：example@example.com）。',
      },
      {
        field: 'consent',
        isValid: () => form.elements.consent.checked,
        message: '内容をご確認のうえ、チェックを入れてください。',
      },
    ],
  };

  // 3. エラーの表示と消去
  function setError(field, message) {
    const group = form.querySelector(`[data-field="${field}"]`);
    const errorEl = group.querySelector('.form-error');
    const hasError = message !== '';

    errorEl.textContent = message;
    errorEl.hidden = !hasError;
    group.classList.toggle('is-error', hasError);

    // 読み上げソフトにも「入力に問題がある」ことと「何が問題か」を伝える
    // aria-describedby には、案内文とエラー文のidをスペース区切りで並べられる
    errorEl.id = `${field}-error`;
    const hint = group.querySelector('.form-hint');
    const describedBy = [hint && hint.id, hasError && errorEl.id].filter(Boolean).join(' ');

    group.querySelectorAll('input').forEach((input) => {
      input.setAttribute('aria-invalid', String(hasError));
      if (describedBy) input.setAttribute('aria-describedby', describedBy);
      else input.removeAttribute('aria-describedby');
    });
  }

  // 今の画面のルールをすべて確かめる。問題がなければ true を返す
  function validateStep(step) {
    let firstError = null;

    (rules[step] || []).forEach((rule) => {
      const ok = rule.isValid();
      setError(rule.field, ok ? '' : rule.message);
      if (!ok && !firstError) firstError = rule.field;
    });

    // 最初のエラーの欄へ移動すると、どこを直せばよいかすぐ分かる
    if (firstError) {
      form.querySelector(`[data-field="${firstError}"] input`).focus();
      return false;
    }
    return true;
  }

  // 4. 画面の切り替え
  // 進み具合の表示を、今の画面に合わせる
  // 手前の段階は「終わった」印を付け、今の段階は aria-current で読み上げにも伝える
  function updateProgress(step) {
    progressItems.forEach((item, index) => {
      const itemStep = index + 1;
      item.classList.toggle('is-done', itemStep < step || step === DONE_STEP);
      if (itemStep === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  function showStep(step) {
    currentStep = step;
    steps.forEach((section) => {
      section.hidden = Number(section.dataset.step) !== step;
    });
    updateProgress(step);

    // 次の画面を先頭から読めるように、スクロールと読み上げの位置を上へ戻す
    // （instant：CSSの scroll-behavior: smooth を使わず、すぐに先頭へ移動する）
    window.scrollTo({ top: 0, behavior: 'instant' });
    form.querySelector(`#step${step}-title`).focus({ preventScroll: true });
  }

  // 画面を進める。履歴にも残して、ブラウザの「戻る」で前の画面に戻れるようにする
  // （履歴に残さないと、「戻る」で入力内容ごとページから出てしまう）
  function goToStep(step) {
    history.pushState({ step }, '');
    showStep(step);
  }

  // 5. 確認画面の一覧を作る
  function buildSummary() {
    const data = new FormData(form);
    const listOf = (name) => data.getAll(name).join('、');

    // 「その他」に書かれた内容を、症状の一覧に添える
    const other = textOf('symptomOther');
    const symptoms = data.getAll('symptom').filter((value) => value !== 'その他');
    if (other) symptoms.push(`その他（${other}）`);
    else if (data.getAll('symptom').includes('その他')) symptoms.push('その他');

    const rows = [
      ['希望する工事内容', textOf('work')],
      ['氏名', `${textOf('familyName')} ${textOf('givenName')}`],
      ['電話番号', telDigits()],
      ['施工場所', textOf('city')],
      ['メールアドレス', textOf('email')],
      ['連絡方法の希望', listOf('contactMethod')],
      ['連絡可能な時間帯', listOf('contactTime')],
      ['建物の種類', listOf('building')],
      ['築年数', listOf('age')],
      ['気になっている症状', symptoms.join('、')],
      ['ご希望の色', listOf('color')],
      ['その他のご相談', textOf('message')],
    ];

    // 入力された文字は textContent で入れる。
    // innerHTML だと、文字の中の < > がHTMLとして動いてしまうことがある
    summary.replaceChildren();
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value || '未入力';
      if (!value) dd.classList.add('is-empty');
      row.append(dt, dd);
      summary.appendChild(row);
    });
  }

  // 6. 全角の数字を半角に直す（「０９０」と入力してもエラーにしない）
  function toHalfWidthDigits(text) {
    return text.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFEE0));
  }

  const telInput = form.elements.tel;
  telInput.addEventListener('input', (event) => {
    // 日本語入力の変換中は値を書き換えない（文字が二重になるのを防ぐ）
    if (!event.isComposing) {
      telInput.value = toHalfWidthDigits(telInput.value);
    }
  });
  // 変換が確定したタイミングで直す
  telInput.addEventListener('compositionend', () => {
    telInput.value = toHalfWidthDigits(telInput.value);
  });

  // 7. イベント
  // 「次の項目へ」「確認画面へ」「送信する」は、すべて submit ボタン。
  // 入力欄でEnterを押したときも同じ流れになる
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // ページの再読み込みを止める

    if (!validateStep(currentStep)) return;

    if (currentStep === CONFIRM_STEP) {
      form.reset();
      updateColorName();
      goToStep(DONE_STEP);
      return;
    }

    const nextStep = currentStep + 1;
    if (nextStep === CONFIRM_STEP) buildSummary();
    goToStep(nextStep);
  });

  // 画面内の「戻る」は、ブラウザの「戻る」と同じ動きにする
  form.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => history.back());
  });

  // 履歴で行こうとしている画面に、本当に進んでよいかを確かめる
  // 「進む」ボタンは submit を通らないので、ここで確かめないと入力チェックを素通りしてしまう
  function reachableStep(step) {
    const target = Math.min(step, CONFIRM_STEP); // 完了画面は「送信する」でしか出さない

    // 手前の画面に問題があれば、そこで止める
    for (let s = 1; s < target; s += 1) {
      if (rules[s].some((rule) => !rule.isValid())) return s;
    }

    // 確認画面は、最新の入力内容で作り直す
    if (target === CONFIRM_STEP) buildSummary();
    return target;
  }

  // ブラウザの「戻る」「進む」が押されたとき
  window.addEventListener('popstate', (event) => {
    // 送信のあとは入力内容を消しているので、フォームには戻さずトップへ
    // replace は履歴を増やさないので、「戻る」でフォームとトップを往復しなくなる
    if (currentStep === DONE_STEP) {
      location.replace('index.html');
      return;
    }

    const requested = event.state ? event.state.step : 1;
    const step = reachableStep(requested);
    showStep(step);

    // 行きたい画面の手前で止めたときは、何を直せばよいかを見せる
    if (step < requested) validateStep(step);
  });

  // ブラウザの「戻る」では、ページが前の状態のまま復活することがある（bfcache）
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && currentStep === DONE_STEP) {
      location.replace('index.html');
      return;
    }
    // ブラウザが選択を復元しても change は起きないので、色の名前を合わせ直す
    updateColorName();
  });

  // 直し始めたら、その欄のエラーをもう一度確かめる
  // （エラーが残ったままだと、直したのに直っていないように見える）
  form.addEventListener('input', (event) => {
    const group = event.target.closest('.is-error');
    if (!group) return;
    const rule = (rules[currentStep] || []).find((item) => item.field === group.dataset.field);
    if (rule && rule.isValid()) setError(rule.field, '');
  });

  // 選んだ色の名前を文字で出す（色の丸だけでは、色が見分けにくい人に伝わらないため）
  function updateColorName() {
    const value = textOf('color');
    const isChip = value !== '' && value !== 'まだ決めていない';
    colorName.hidden = !isChip;
    colorName.textContent = isChip ? `選択中：${value}` : '';
  }

  form.addEventListener('change', (event) => {
    if (event.target.name === 'color') updateColorName();
  });

  // 8. トップの色見本から来たときは、選んだ色を最初から選択しておく
  //    URLは誰でも書き換えられるので、フォームにある色と一致するときだけ使う
  const colorFromUrl = new URLSearchParams(location.search).get('color');
  const matchedColor = [...form.elements.color].find((radio) => radio.value === colorFromUrl);
  if (matchedColor) {
    matchedColor.checked = true;
    updateColorName();
  }

  // 9. 最初の画面を表示する（フォーカスは動かさない）
  history.replaceState({ step: 1 }, '');
  form.querySelector('[data-step="1"]').hidden = false;
  progress.hidden = false;
  updateProgress(1);
})();
