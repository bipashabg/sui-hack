import NodeCache from "node-cache";
export class CacheService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 600 });
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    set(key, value) {
        return this.cache.set(key, value);
    }
    get(key) {
        return this.cache.get(key);
    }
    del(key) {
        return this.cache.del(key);
    }
}
//# sourceMappingURL=cache.service.js.map