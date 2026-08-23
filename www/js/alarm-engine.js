// ================================================
// ALARM ENGINE — শিডিউলিং, স্টোরেজ, ট্রিগার হ্যান্ডলিং
// ================================================

const AlarmEngine = (function () {

    const STORAGE_KEY = 'smart_alarms_v1';

    function getAll() {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    function saveAll(alarms) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
            return true;
        } catch (e) {
            console.error('Storage save failed:', e);
            alert('⚠️ সেভ করা যায়নি! সম্ভবত কাস্টম রিংটোন/ভয়েস ফাইলের সাইজ অনেক বড়। ছোট (২ MB-এর কম) অডিও ফাইল বা ভয়েস রেকর্ডিং ব্যবহার করুন, অথবা একটা প্রিসেট রিংটোন (ক্লাসিক/জেন্টল/বেল ইত্যাদি) সিলেক্ট করুন।');
            return false;
        }
    }

    function add(alarm) {
        const alarms = getAll();
        alarm.id = Date.now();
        alarms.push(alarm);
        const ok = saveAll(alarms);
        if (!ok) return null;
        schedule(alarm);
        return alarm;
    }

    function remove(id) {
        let alarms = getAll();
        alarms = alarms.filter(a => a.id !== id);
        saveAll(alarms);
        if (window.cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.cancel(id);
        }
    }

    // অ্যালার্মের সময় থেকে পরবর্তী ট্রিগার ডেট বের করা
    function nextTriggerDate(alarm) {
        const [h, m] = alarm.time.split(':').map(Number);
        const now = new Date();
        let target = new Date();
        target.setHours(h, m, 0, 0);

        if (alarm.days && alarm.days.length > 0) {
            if (target <= now) target.setDate(target.getDate() + 1);
            return target;
        } else {
            if (target <= now) target.setDate(target.getDate() + 1);
            return target;
        }
    }

    function schedule(alarm) {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) {
            console.warn('Local notification plugin not ready (ব্রাউজার প্রিভিউ মোডে চলছে)');
            return;
        }

        const triggerDate = nextTriggerDate(alarm);

        const options = {
            id: alarm.id,
            title: alarm.label || 'MustWake ⏰',
            text: 'অ্যালার্ম বাজছে — মিশন সম্পন্ন করুন',
            foreground: true,
            vibrate: true,
            priority: 2,
            lockscreen: true,
            launch: true,
            wakeup: true,
            autoClear: false,
            sticky: true,
            channel: 'mustwake_alarm_channel',
            androidChannelId: 'mustwake_alarm_channel',
            trigger: alarm.days && alarm.days.length > 0
                ? { every: { hour: triggerDate.getHours(), minute: triggerDate.getMinutes() } }
                : { at: triggerDate },
            data: { alarmId: alarm.id }
        };

        // হাই-প্রায়োরিটি চ্যানেল তৈরি — এটা ছাড়া Android ব্যাকগ্রাউন্ড থেকে অ্যাপ খুলবে না
        if (cordova.plugins.notification.local.createChannel) {
            cordova.plugins.notification.local.createChannel({
                id: 'mustwake_alarm_channel',
                description: 'MustWake অ্যালার্ম নোটিফিকেশন',
                importance: 5,
                sound: true,
                vibration: true
            });
        }

        cordova.plugins.notification.local.schedule(options);
    }

    function rescheduleAllOnBoot() {
        getAll().forEach(schedule);
    }

    function setupListeners(onTrigger) {
        if (!window.cordova || !cordova.plugins || !cordova.plugins.notification) return;
        cordova.plugins.notification.local.on('trigger', function (notification) {
            onTrigger(notification.data.alarmId);
        });
        cordova.plugins.notification.local.on('click', function (notification) {
            onTrigger(notification.data.alarmId);
        });
    }

    function snooze(alarm, minutes) {
        const snoozeTime = new Date(Date.now() + minutes * 60000);
        if (window.cordova && cordova.plugins && cordova.plugins.notification) {
            cordova.plugins.notification.local.schedule({
                id: alarm.id + 900000,
                title: (alarm.label || 'MustWake') + ' (স্নুজ)',
                text: 'স্নুজ শেষ — মিশন সম্পন্ন করুন',
                trigger: { at: snoozeTime },
                foreground: true,
                vibrate: true,
                lockscreen: true,
                data: { alarmId: alarm.id }
            });
        }
    }

    return { getAll, saveAll, add, remove, schedule, rescheduleAllOnBoot, setupListeners, snooze };
})();
