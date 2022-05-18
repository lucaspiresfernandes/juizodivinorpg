const global = {};

{
    global.clamp = function clamp(n, min, max) {
        if (n < min)
            return min;
        if (n > max)
            return max;
        return n;
    }

    global.sleep = function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

$(document.body).ready(() => {
    $('form[action="/sheet/leave"] a').click(ev => $(ev.target).parent().trigger('submit'));
})