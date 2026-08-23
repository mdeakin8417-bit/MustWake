// ================================================
// MISSION SYSTEM — যতক্ষণ না মিশন সম্পন্ন হয়, অ্যালার্ম বন্ধ হবে না
// ================================================

const Missions = (function () {

    let currentAlarm = null;
    let onSuccessCallback = null;
    let roundsLeft = 1;

    function start(alarm, onSuccess) {
        currentAlarm = alarm;
        onSuccessCallback = onSuccess;
        roundsLeft = (alarm.mathRounds && alarm.missionType === 'math') ? alarm.mathRounds : 1;
        render();
    }

    function render() {
        const area = document.getElementById('missionArea');
        area.innerHTML = '';

        switch (currentAlarm.missionType) {
            case 'math': renderMath(area); break;
            case 'typing': renderTyping(area); break;
            case 'password': renderPassword(area); break;
            case 'shake': renderShake(area); break;
            case 'photo': renderPhoto(area); break;
            default: renderNone(area); break;
        }
    }

    function generateMath(difficulty) {
        let a, b, op = '+';
        if (difficulty === 'easy') {
            a = Math.floor(Math.random() * 90) + 10;
            b = Math.floor(Math.random() * 90) + 10;
        } else if (difficulty === 'medium') {
            a = Math.floor(Math.random() * 900) + 100;
            b = Math.floor(Math.random() * 900) + 100;
            op = Math.random() > 0.5 ? '+' : '-';
        } else {
            a = Math.floor(Math.random() * 90) + 10;
            b = Math.floor(Math.random() * 90) + 10;
            op = '×';
        }
        let answer;
        if (op === '+') answer = a + b;
        else if (op === '-') answer = Math.max(a, b) - Math.min(a, b);
        else answer = a * b;

        if (op === '-' && a < b) { const t = a; a = b; b = t; }

        return { text: `${a} ${op} ${b} = ?`, answer };
    }

    function renderMath(area) {
        const problem = generateMath(currentAlarm.mathDifficulty || 'easy');
        area.dataset.answer = problem.answer;
        area.innerHTML = `
            <div class="mission-question">${problem.text}</div>
            <input type="number" class="mission-input" id="missionAnswer" placeholder="উত্তর লিখুন">
            <button class="mission-btn" id="missionSubmit">জমা দিন (বাকি: ${roundsLeft})</button>
            <div class="mission-error" id="missionError">ভুল উত্তর! আবার চেষ্টা করুন।</div>
        `;
        document.getElementById('missionSubmit').onclick = function () {
            const val = parseInt(document.getElementById('missionAnswer').value, 10);
            if (val === problem.answer) {
                roundsLeft--;
                if (roundsLeft <= 0) { succeed(); }
                else { render(); }
            } else {
                document.getElementById('missionError').style.display = 'block';
                if (navigator.vibrate) navigator.vibrate(300);
            }
        };
    }

    function renderTyping(area) {
        const sentence = currentAlarm.typingSentence || 'আমি এখন ঘুম থেকে উঠছি';
        area.innerHTML = `
            <div class="mission-question" style="font-size:20px;">"${sentence}"</div>
            <input type="text" class="mission-input" id="missionAnswer" placeholder="এখানে টাইপ করুন">
            <button class="mission-btn" id="missionSubmit">জমা দিন</button>
            <div class="mission-error" id="missionError">মিলছে না! আবার চেষ্টা করুন।</div>
        `;
        document.getElementById('missionSubmit').onclick = function () {
            const val = document.getElementById('missionAnswer').value.trim();
            if (val === sentence.trim()) succeed();
            else {
                document.getElementById('missionError').style.display = 'block';
                if (navigator.vibrate) navigator.vibrate(300);
            }
        };
    }

    function renderPassword(area) {
        area.innerHTML = `
            <div class="mission-question" style="font-size:20px;">🔑 পাসওয়ার্ড দিন</div>
            <input type="password" class="mission-input" id="missionAnswer" placeholder="পাসওয়ার্ড">
            <button class="mission-btn" id="missionSubmit">আনলক</button>
            <div class="mission-error" id="missionError">ভুল পাসওয়ার্ড!</div>
        `;
        document.getElementById('missionSubmit').onclick = function () {
            const val = document.getElementById('missionAnswer').value;
            if (val === currentAlarm.password) succeed();
            else {
                document.getElementById('missionError').style.display = 'block';
                if (navigator.vibrate) navigator.vibrate(300);
            }
        };
    }

    function renderShake(area) {
        let shakeCount = 0;
        const needed = 15;
        area.innerHTML = `
            <div class="mission-question">📱 ফোনটি ঝাঁকান</div>
            <div style="font-size:18px; color:#94a3b8;">শেক করা হয়েছে: <span id="shakeCount">0</span> / ${needed}</div>
        `;
        let lastX = null, lastY = null, lastZ = null;
        function handleMotion(e) {
            const acc = e.accelerationIncludingGravity;
            if (!acc) return;
            if (lastX !== null) {
                const delta = Math.abs(acc.x - lastX) + Math.abs(acc.y - lastY) + Math.abs(acc.z - lastZ);
                if (delta > 25) {
                    shakeCount++;
                    document.getElementById('shakeCount').textContent = shakeCount;
                    if (shakeCount >= needed) {
                        window.removeEventListener('devicemotion', handleMotion);
                        succeed();
                    }
                }
            }
            lastX = acc.x; lastY = acc.y; lastZ = acc.z;
        }
        window.addEventListener('devicemotion', handleMotion);
    }

    // ---------- ফটো ম্যাচ চ্যালেঞ্জ — অটোমেটিক ছবি তুলনা (৭০%+ মিললেই বন্ধ হবে) ----------
    const MATCH_THRESHOLD = 70;

    function loadImg(dataUrl, cb) {
        const img = new Image();
        img.onload = () => cb(img);
        img.src = dataUrl;
    }

    function grayscalePixels(img, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const gray = [];
        for (let i = 0; i < data.length; i += 4) {
            gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        return gray;
    }

    function compareImages(dataUrlA, dataUrlB, callback) {
        const SIZE = 24;
        loadImg(dataUrlA, imgA => {
            loadImg(dataUrlB, imgB => {
                const gA = grayscalePixels(imgA, SIZE);
                const gB = grayscalePixels(imgB, SIZE);
                let diffSum = 0;
                for (let i = 0; i < gA.length; i++) diffSum += Math.abs(gA[i] - gB[i]);
                const avgDiff = diffSum / gA.length;
                const similarity = Math.max(0, Math.min(100, 100 - (avgDiff / 255 * 100)));
                callback(Math.round(similarity));
            });
        });
    }

    function renderPhoto(area) {
        area.innerHTML = `
            <div class="mission-question" style="font-size:18px;">📷 রেফারেন্স ছবির জায়গাটির ছবি তুলুন</div>
            <p style="color:#94a3b8; font-size:13px; margin-bottom:10px;">যেমন: ওয়াশরুমের আয়না / ঘরের দরজা</p>
            <img id="refPreview" class="camera-preview" src="${currentAlarm.photoRef || ''}" style="display:${currentAlarm.photoRef ? 'block' : 'none'}; opacity:0.6;">
            <div style="display:flex; gap:10px; margin-top:14px;">
                <button class="mission-btn" id="missionSubmitCamera" style="flex:1;">📷 ক্যামেরা</button>
                <button class="mission-btn" id="missionSubmitGallery" style="flex:1; background:linear-gradient(145deg,#64748b,#475569);">🖼️ গ্যালারি</button>
            </div>
            <div id="matchStatus" style="margin-top:14px; font-size:14px; color:#94a3b8;"></div>
            <div class="mission-error" id="missionError">মিলছে না (${MATCH_THRESHOLD}%-এর কম)! আবার তুলুন।</div>
        `;

        function capture(useGallery) {
            if (window.navigator && navigator.camera) {
                navigator.camera.getPicture(function (imageData) {
                    checkMatch('data:image/jpeg;base64,' + imageData);
                }, function (err) {
                    console.warn('ছবি নেওয়া ব্যর্থ:', err);
                }, {
                    quality: 60,
                    destinationType: Camera.DestinationType.DATA_URL,
                    sourceType: useGallery ? Camera.PictureSourceType.PHOTOLIBRARY : Camera.PictureSourceType.CAMERA,
                    correctOrientation: true
                });
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                if (!useGallery) input.capture = 'environment';
                input.onchange = function (e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => checkMatch(ev.target.result);
                    reader.readAsDataURL(file);
                };
                input.click();
            }
        }

        function checkMatch(dataUrl) {
            const statusEl = document.getElementById('matchStatus');
            const errorEl = document.getElementById('missionError');
            errorEl.style.display = 'none';
            statusEl.textContent = '⏳ মিল যাচাই হচ্ছে...';

            const oldShot = area.querySelector('img.new-shot');
            if (oldShot) oldShot.remove();
            const preview = document.createElement('img');
            preview.className = 'camera-preview new-shot';
            preview.src = dataUrl;
            statusEl.parentNode.insertBefore(preview, statusEl);

            if (!currentAlarm.photoRef) {
                statusEl.textContent = '';
                area.innerHTML += `<button class="mission-btn" id="confirmMatch">মিলে গেছে ✔</button>`;
                document.getElementById('confirmMatch').onclick = succeed;
                return;
            }

            compareImages(currentAlarm.photoRef, dataUrl, function (similarity) {
                if (similarity >= MATCH_THRESHOLD) {
                    statusEl.innerHTML = `<span style="color:#34d399; font-weight:700;">✅ ${similarity}% মিলেছে — অ্যালার্ম বন্ধ হচ্ছে...</span>`;
                    if (navigator.vibrate) navigator.vibrate(100);
                    setTimeout(succeed, 600);
                } else {
                    statusEl.innerHTML = `<span style="color:#f87171; font-weight:700;">মাত্র ${similarity}% মিলেছে (দরকার ${MATCH_THRESHOLD}%+)</span>`;
                    errorEl.style.display = 'block';
                    if (navigator.vibrate) navigator.vibrate(300);
                }
            });
        }

        document.getElementById('missionSubmitCamera').onclick = () => capture(false);
        document.getElementById('missionSubmitGallery').onclick = () => capture(true);
    }

    function renderNone(area) {
        area.innerHTML = `
            <div class="mission-question" style="font-size:20px;">অ্যালার্ম বন্ধ করুন</div>
            <button class="mission-btn" id="missionSubmit">বন্ধ করুন</button>
        `;
        document.getElementById('missionSubmit').onclick = succeed;
    }

    function succeed() {
        if (onSuccessCallback) onSuccessCallback();
    }

    return { start };
})();
