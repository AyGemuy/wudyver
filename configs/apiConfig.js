import CryptoJS from 'crypto-js';

class ConfigManager {
    constructor() {
        this.PASSWORD = "wudysoft";

        this.MONGODB_URI = this.decURI();
        this.JWT_SECRET = this.genJWT();

        this.DOMAIN_URL = "wudysoft.xyz";
        this.EMAIL = "wudysoft@mail.com";
        this.LIMIT_POINTS = 30;
        this.LIMIT_DURATION = 60;
    }

    decURI() {
        const encUri = "U2FsdGVkX1/i3lhTQd1hCo+aHjA5TyqdnDcKyIqW7o6zlMAJuPEun4P1PzdtmK1kIQIhLo2wipt1KeWk7oWZ6J3sJUG7bEcaJhAgzomvrWtvPZxBXQKr7rGgWt6QaOUcmkGiOBrXStKZKSItLAvbAW1EokJV08tfRjGkN0Xknok=";
        return CryptoJS.AES.decrypt(encUri, this.PASSWORD).toString(CryptoJS.enc.Utf8);
    }

    _b64Url(obj) {
        return CryptoJS.enc.Base64url.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(obj)));
    }

    genJWT() {
        const header = { alg: "HS256", typ: "JWT" };
        const payload = { domain: this.DOMAIN_URL, iat: Math.floor(Date.now() / 1000) };

        const encHeader = this._b64Url(header);
        const encPayload = this._b64Url(payload);

        const dataToSign = `${encHeader}.${encPayload}`;
        const signature = CryptoJS.HmacSHA256(dataToSign, this.PASSWORD).toString(CryptoJS.enc.Base64url);

        return `${dataToSign}.${signature}`;
    }
}

const apiConfig = new ConfigManager();
export default apiConfig;