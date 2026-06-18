const siteName = 'ЭлектроМаркет';
const siteTagline = 'Электроника и гаджеты с умными рекомендациями';

function pageTitle(name) {
    return `${name} — ${siteName}`;
}

module.exports = {
    siteName,
    siteTagline,
    pageTitle
};
