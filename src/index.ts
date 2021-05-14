import Fastify, {FastifyInstance} from 'fastify'
import {FastifyRequest} from "fastify/types/request"
import {hcPages} from '@uyamazak/fastify-hc-pages'
import {Page} from 'puppeteer';

const formBodyPlugin = require('fastify-formbody');

const PORT = 8085;
const PAGES_NUM = 5;
const PAGE_TIMEOUT = 60000;

const server: FastifyInstance = Fastify({});
const hcOpt: Object = {
    /**
     * Number of Pages to launch.
     * Change according to the number of requests and machine resources.
     */
    pagesNum: PAGES_NUM,
    pageOptions: {
        /**
         * @see https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-pagesetuseragentuseragent
         */
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
        /**
         * @see https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-pagesetdefaulttimeouttimeout
         */
        pageTimeoutMilliseconds: PAGE_TIMEOUT,
        /**
         * @see https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-pageemulatemediatypetype
         */
        emulateMediaTypeScreenEnabled: false,
        /**
         * Add Accept-Language HTTP header
         */
        acceptLanguage: '',
        /**
         * @see https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-pagesetviewportviewport
         */
        viewport: null,
    },
    /**
     * @see https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-puppeteerlaunchoptions
     */
    launchOptions: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
        ]
    },
};
interface RequestBody {
    text?: string;
    tl?: string;
    sl?: string;
}

const gTranslate = async (sl: string = 'auto', tl: string = 'ru', text: string = '') => {
    // Make result you need in callback function with Page
    return await server.runOnPage<string | null>(async (page: Page) => {

        await page.goto(`https://translate.google.com/#view=home&op=translate&sl=${sl}&tl=${tl}`);
        await page.waitForSelector('h2.oBOnKe');
        await page.waitForTimeout(1000);

        // string that we want to translate and type it on the textarea
        if (text.length ==0) return '';
        await page.type('div.D5aOJc.Hapztf', text);

        // wait for the result container available
        await page.waitForSelector('span.JLqJ4b.ChMk0b > span');
        await page.waitForTimeout(3000);

        // get the result string (translated text)
        return await page.evaluate(() => {
            return document.querySelectorAll('span.JLqJ4b.ChMk0b > span')[0].textContent;
        });
    });

};

// Work together with Puppeteer's Page in callback function.
server.post('/translate', async (request: FastifyRequest, reply) => {
    let reqbody: RequestBody | any = request.body;
    const result = await gTranslate(reqbody?.sl,reqbody?.tl,reqbody?.text);
    reply.send(result)
});
// Quick Test in browser.
// Result MUST be a string: Вы понимаете, что ваше лицо уродливое?
server.get('/translate', async (request: FastifyRequest, reply) => {
    const result = await gTranslate('auto','ru','Apa kamu sadar kalau muka kamu itu jelek sekali?');
    reply.send(result)
});

const start = async () => {
    try {
        // Register this plugin
        await server.register(formBodyPlugin);
        await server.register(hcPages, hcOpt);
        await server.listen(PORT);

    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start().catch();
