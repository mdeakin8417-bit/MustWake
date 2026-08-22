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

    // ---------- ম্যাথ চ্যালেঞ্জ ----------
    function generateMath(difficulty) {
        let a, b, op = '+';
        if (difficulty === 'easy') {
            a = Math.floor(Math.random() * 90) + 10;
            b = Math.floor(Math.random() * 90) + 10;
        } else if (difficulty === 'medium') {
            a = Math.floor(Math.random() * 900) + 100;
            b = Math.floor(Math.random() * 900) + 100;
            op = Math.random() > 0.5 ? '+' : '-';
        } else { // hard
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

    // ---------- টাইপিং চ্যালেঞ্জ ----------
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

    // ---------- পাসওয়ার্ড চ্যালেঞ্জ ----------
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

    // ---------- শেক চ্যালেঞ্জ ----------
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

    // ---------- ফটো ম্যাচ চ্যালেঞ্জ (Phase 2) ----------
    function renderPhoto(area) {
        area.innerHTML = `
            <div class="mission-question" style="font-size:18px;">📷 রেফারেন্স ছবির জায়গাটির ছবি তুলুন</div>
            <p style="color:#94a3b8; font-size:13px; margin-bottom:10px;">যেমন: ওয়াশরুমের আয়না / ঘরের দরজা</p>
            <img id="refPreview" class="camera-preview" src="${currentAlarm.photoRef || ''}" style="display:${currentAlarm.photoRef ? 'block' : 'none'}; opacity:0.5;">
            <button class="mission-btn" id="missionSubmit">ক্যামেরা খুলুন</button>
            <div class="mission-error" id="missionError">মিলেনি! আবার তুলুন।</div>
            <p style="color:#64748b; font-size:11px; margin-top:14px;">
                নোট: ছবি-ম্যাচিং (OpenCV.js ফিচার ম্যাচিং) Phase-2 আপডেটে যুক্ত হবে।
                এখন পর্যন্ত এটি ম্যানুয়াল কনফার্মেশন হিসেবে কাজ করে — ছবি তোলার পর
                "মিলে গেছে" চাপলে অ্যালার্ম বন্ধ হবে।
            </p>
        `;
        document.getElementById('missionSubmit').onclick = function () {
            if (window.navigator && navigator.camera) {
                // ------- আসল APK-তে (নেটিভ ক্যামেরা প্লাগইন) -------
                navigator.camera.getPicture(function (imageURI) {
                    area.innerHTML += `
                        <img class="camera-preview" src="${imageURI}">
                        <button class="mission-btn" id="confirmMatch">মিলে গেছে ✔</button>
                    `;
                    document.getElementById('confirmMatch').onclick = succeed;
                }, function () {
                    alert('ক্যামেরা চালু করা যায়নি');
                }, {
                    quality: 60,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.CAMERA
                });
            } else {
                // ------- Spck/ব্রাউজার প্রিভিউ টেস্ট মোড (HTML5 file input দিয়ে) -------
                let fileInput = document.getElementById('photoFallbackInput');
                if (!fileInput) {
                    fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.capture = 'environment';
                    fileInput.id = 'photoFallbackInput';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                }
                fileInput.onchange = function (e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = function (ev) {
                        area.innerHTML += `
                            <img class="camera-preview" src="${ev.target.result}">
                            <button class="mission-btn" id="confirmMatch">মিলে গেছে ✔</button>
                        `;
                        document.getElementById('confirmMatch').onclick = succeed;
                    };
                    reader.readAsDataURL(file);
                };
                fileInput.click();
            }
        };
    }

    // ---------- কোনো চ্যালেঞ্জ নেই ----------
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
