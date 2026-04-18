export function getCookieValue(req, name) {
    if (req.cookies && req.cookies[name]) {
        return req.cookies[name];
    }

    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return undefined;

    return cookieHeader.split(';').reduce((value, cookieSegment) => {
        const [cookieName, ...cookieValue] = cookieSegment.trim().split('=');
        if (cookieName === name) {
            return decodeURIComponent(cookieValue.join('='));
        }
        return value;
    }, undefined);
}
