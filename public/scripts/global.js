const global = {};

{
    global.clamp = function clamp(n, min, max) {
        if (n < min)
            return min;
        if (n > max)
            return max;
        return n;
    }

    const clickEventsList = new Map();
    const clickCountThreshold = 250;

    global.getClickCount = function getClickCount(jsEvent) {
        let clickEvent = clickEventsList.get(jsEvent.currentTarget);

        if (!clickEvent) {
            clickEvent = { clickCount: 0 };
            clickEventsList.set(jsEvent.currentTarget, clickEvent);
        }
        else clearTimeout(clickEvent.timeout);

        clickEvent.clickCount = clickEvent.clickCount + 1;
        clickEvent.timeout = setTimeout(() => {
            clickEventsList.delete(jsEvent.currentTarget);
        }, clickCountThreshold);

        return clickEvent.clickCount;
    }

    global.sleep = function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

$(document.body).ready(() => {
    $('form[action="/sheet/leave"] a').click(ev => $(ev.target).parent().trigger('submit'));
})