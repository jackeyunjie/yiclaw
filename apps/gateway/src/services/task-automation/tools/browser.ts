/**
 * 浏览器自动化工具
 *
 * 基于 Puppeteer 实现浏览器自动化操作
 * 类似 browser-use 的核心功能
 */

import { createLogger } from '../../../utils/logger';
import type { Tool } from '../ToolExecutor';
import puppeteer, { type Browser, type Page } from 'puppeteer';

const logger = createLogger('BrowserTool');

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }
  return browser;
}

async function getPage(): Promise<Page> {
  const b = await getBrowser();
  const pages = await b.pages();
  if (pages.length > 0) {
    return pages[0];
  }
  return await b.newPage();
}

/**
 * 导航到 URL
 */
export const browserNavigateTool: Tool = {
  name: 'browser_navigate',
  description: '导航到指定 URL，可用于打开网页',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: '目标网页 URL'
      },
      waitUntil: {
        type: 'string',
        description: '等待策略：load, domcontentloaded, networkidle0, networkidle2'
      },
      timeout: {
        type: 'number',
        description: '超时时间（毫秒），默认 30000'
      }
    },
    required: ['url']
  },
  async execute(params) {
    const startTime = Date.now();
    const url = String(params.url);
    const waitUntil = String(params.waitUntil || 'networkidle2');
    const timeout = Number(params.timeout || 30000);

    try {
      const page = await getPage();
      await page.setViewport({ width: 1280, height: 800 });

      await page.goto(url, { waitUntil: waitUntil as any, timeout });

      const title = await page.title();
      const currentUrl = page.url();

      return {
        success: true,
        data: {
          title,
          url: currentUrl,
          message: `已导航到: ${currentUrl}`
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('浏览器导航失败', error);
      return {
        success: false,
        error: `导航失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 截图工具
 */
export const browserScreenshotTool: Tool = {
  name: 'browser_screenshot',
  description: '对当前页面或指定元素进行截图',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器（可选，不填则截取整个页面）'
      },
      fullPage: {
        type: 'boolean',
        description: '是否截取完整页面（默认 false）'
      },
      encoding: {
        type: 'string',
        description: '图片编码：base64 或 binary（默认 base64）'
      },
      name: {
        type: 'string',
        description: '截图文件名（可选）'
      }
    }
  },
  async execute(params) {
    const startTime = Date.now();
    const selector = params.selector ? String(params.selector) : undefined;
    const fullPage = params.fullPage === true;
    const encoding = String(params.encoding || 'base64');

    try {
      const page = await getPage();

      let screenshot: Buffer | string;
      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          return {
            success: false,
            error: `未找到元素: ${selector}`,
            executionTime: Date.now() - startTime
          };
        }
        screenshot = await element.screenshot({
          type: 'png',
          encoding: encoding as any
        });
      } else {
        screenshot = await page.screenshot({
          fullPage,
          type: 'png',
          encoding: encoding as any
        });
      }

      const base64 = encoding === 'base64' 
        ? Buffer.isBuffer(screenshot) ? screenshot.toString('base64') : screenshot
        : Buffer.isBuffer(screenshot) ? screenshot.toString('base64') : screenshot;

      return {
        success: true,
        data: {
          image: base64,
          format: 'png',
          size: base64.length,
          name: params.name || 'screenshot.png'
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('截图失败', error);
      return {
        success: false,
        error: `截图失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 点击元素
 */
export const browserClickTool: Tool = {
  name: 'browser_click',
  description: '点击页面上的指定元素',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器或 XPath'
      },
      delay: {
        type: 'number',
        description: '点击后等待时间（毫秒）'
      }
    },
    required: ['selector']
  },
  async execute(params) {
    const startTime = Date.now();
    const selector = String(params.selector);
    const delay = Number(params.delay || 0);

    try {
      const page = await getPage();

      const element = await page.$(selector);
      if (!element) {
        return {
          success: false,
          error: `未找到元素: ${selector}`,
          executionTime: Date.now() - startTime
        };
      }

      await element.click();

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const currentUrl = page.url();

      return {
        success: true,
        data: {
          message: `已点击元素: ${selector}`,
          url: currentUrl
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('点击元素失败', error);
      return {
        success: false,
        error: `点击失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 填写输入框
 */
export const browserFillTool: Tool = {
  name: 'browser_fill',
  description: '在输入框或文本域中填写内容',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器'
      },
      value: {
        type: 'string',
        description: '要填写的值'
      },
      clear: {
        type: 'boolean',
        description: '填写前是否清空（默认 true）'
      }
    },
    required: ['selector', 'value']
  },
  async execute(params) {
    const startTime = Date.now();
    const selector = String(params.selector);
    const value = String(params.value);
    const clear = params.clear !== false;

    try {
      const page = await getPage();

      const element = await page.$(selector);
      if (!element) {
        return {
          success: false,
          error: `未找到元素: ${selector}`,
          executionTime: Date.now() - startTime
        };
      }

      if (clear) {
        await element.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
      }

      await element.type(value, { delay: 50 });

      return {
        success: true,
        data: {
          message: `已填写: ${selector} = ${value}`,
          value
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('填写失败', error);
      return {
        success: false,
        error: `填写失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 执行 JavaScript
 */
export const browserEvaluateTool: Tool = {
  name: 'browser_evaluate',
  description: '在浏览器中执行 JavaScript 代码',
  parameters: {
    type: 'object',
    properties: {
      script: {
        type: 'string',
        description: '要执行的 JavaScript 代码'
      }
    },
    required: ['script']
  },
  async execute(params) {
    const startTime = Date.now();
    const script = String(params.script);

    try {
      const page = await getPage();

      const result = await page.evaluate(script);

      return {
        success: true,
        data: {
          result,
          message: 'JavaScript 执行成功'
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('JavaScript 执行失败', error);
      return {
        success: false,
        error: `执行失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 获取页面内容
 */
export const browserGetContentTool: Tool = {
  name: 'browser_get_content',
  description: '获取当前页面的 HTML 内容或文本内容',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: '内容类型：html 或 text（默认 html）'
      },
      selector: {
        type: 'string',
        description: 'CSS 选择器（可选，获取特定元素内容）'
      }
    }
  },
  async execute(params) {
    const startTime = Date.now();
    const type = String(params.type || 'html');
    const selector = params.selector ? String(params.selector) : undefined;

    try {
      const page = await getPage();

      let content: string;

      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          return {
            success: false,
            error: `未找到元素: ${selector}`,
            executionTime: Date.now() - startTime
          };
        }
        content = type === 'text'
          ? await element.evaluate(el => el.textContent || '')
          : await element.evaluate(el => el.outerHTML || '');
      } else {
        content = type === 'text'
          ? await page.evaluate(() => document.body.innerText)
          : await page.content();
      }

      const truncated = content.length > 50000;
      const displayContent = truncated ? content.substring(0, 50000) + '\n... (内容已截断)' : content;

      return {
        success: true,
        data: {
          content: displayContent,
          fullLength: content.length,
          truncated,
          url: page.url(),
          title: await page.title()
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('获取内容失败', error);
      return {
        success: false,
        error: `获取内容失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 等待元素
 */
export const browserWaitTool: Tool = {
  name: 'browser_wait',
  description: '等待指定元素出现或等待指定时间',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS 选择器（可选）'
      },
      timeout: {
        type: 'number',
        description: '等待超时时间（毫秒），默认 30000'
      },
      visible: {
        type: 'boolean',
        description: '是否等待元素可见（默认 true）'
      }
    }
  },
  async execute(params) {
    const startTime = Date.now();
    const selector = params.selector ? String(params.selector) : undefined;
    const timeout = Number(params.timeout || 30000);
    const visible = params.visible !== false;

    try {
      const page = await getPage();

      if (selector) {
        await page.waitForSelector(selector, { visible, timeout });
        return {
          success: true,
          data: {
            message: `元素已出现: ${selector}`
          },
          executionTime: Date.now() - startTime
        };
      } else {
        await new Promise(resolve => setTimeout(resolve, timeout));
        return {
          success: true,
          data: {
            message: `等待完成: ${timeout}ms`
          },
          executionTime: Date.now() - startTime
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `等待失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 关闭浏览器
 */
export const browserCloseTool: Tool = {
  name: 'browser_close',
  description: '关闭浏览器实例，释放资源',
  parameters: {
    type: 'object',
    properties: {}
  },
  async execute() {
    const startTime = Date.now();

    try {
      if (browser) {
        await browser.close();
        browser = null;
      }

      return {
        success: true,
        data: {
          message: '浏览器已关闭'
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('关闭浏览器失败', error);
      return {
        success: false,
        error: `关闭失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};
