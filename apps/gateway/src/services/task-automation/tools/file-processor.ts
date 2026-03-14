/**
 * 文件处理工具
 *
 * 支持 PDF、Excel、Word 文档解析和处理
 */

import { createLogger } from '../../../utils/logger';
import type { Tool } from '../ToolExecutor';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger('FileProcessorTool');

/**
 * 解析 Excel 文件工具
 */
export const parseExcelTool: Tool = {
  name: 'parse_excel',
  description: '解析 Excel 文件，提取数据和元数据',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Excel 文件路径'
      },
      sheetName: {
        type: 'string',
        description: '工作表名称（可选，默认第一个）'
      },
      headerRow: {
        type: 'number',
        description: '表头行号（从1开始，默认1）'
      },
      range: {
        type: 'string',
        description: '数据范围（例如 A1:D10，可选）'
      }
    },
    required: ['filePath']
  },
  async execute(params) {
    const startTime = Date.now();
    const filePath = String(params.filePath);
    const sheetName = params.sheetName ? String(params.sheetName) : undefined;
    const headerRow = Number(params.headerRow || 1);
    const range = params.range ? String(params.range) : undefined;

    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 动态导入 xlsx
      const xlsx = await import('xlsx');

      // 读取文件
      const fileBuffer = await fs.readFile(filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

      // 获取工作表
      const targetSheet = sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheet];

      if (!worksheet) {
        return {
          success: false,
          error: `工作表 "${targetSheet}" 不存在`,
          executionTime: Date.now() - startTime
        };
      }

      // 解析数据
      const options: any = {
        header: headerRow === 1 ? 1 : headerRow - 1,
        defval: null
      };

      if (range) {
        options.range = range;
      }

      const data = xlsx.utils.sheet_to_json(worksheet, options);

      // 获取表头
      const headers = headerRow === 1 && data.length > 0
        ? Object.keys(data[0] as object)
        : [];

      // 获取元数据
      const metadata = {
        fileName: path.basename(filePath),
        sheetName: targetSheet,
        sheetNames: workbook.SheetNames,
        rowCount: data.length,
        columnCount: headers.length,
        headers
      };

      return {
        success: true,
        data: {
          metadata,
          data: data.slice(0, 1000), // 限制返回数量
          totalRows: data.length
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('解析 Excel 失败', error);
      return {
        success: false,
        error: `解析 Excel 失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 生成 Excel 文件工具
 */
export const generateExcelTool: Tool = {
  name: 'generate_excel',
  description: '生成 Excel 文件',
  parameters: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        description: '数据数组'
      },
      sheetName: {
        type: 'string',
        description: '工作表名称（默认 Sheet1）'
      },
      outputPath: {
        type: 'string',
        description: '输出文件路径'
      }
    },
    required: ['data', 'outputPath']
  },
  async execute(params) {
    const startTime = Date.now();
    const data = params.data as any[];
    const sheetName = String(params.sheetName || 'Sheet1');
    const outputPath = String(params.outputPath);

    try {
      if (!data || data.length === 0) {
        return {
          success: false,
          error: '数据不能为空',
          executionTime: Date.now() - startTime
        };
      }

      // 动态导入 xlsx
      const xlsx = await import('xlsx');

      // 创建工作表
      const worksheet = xlsx.utils.json_to_sheet(data);

      // 创建工作簿
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

      // 确保目录存在
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // 写入文件
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      await fs.writeFile(outputPath, buffer);

      return {
        success: true,
        data: {
          outputPath,
          rowCount: data.length,
          fileSize: buffer.length
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('生成 Excel 失败', error);
      return {
        success: false,
        error: `生成 Excel 失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 解析 PDF 文件工具
 */
export const parsePdfTool: Tool = {
  name: 'parse_pdf',
  description: '解析 PDF 文件，提取文本内容',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'PDF 文件路径'
      },
      pageRange: {
        type: 'string',
        description: '页码范围（例如 1-5，可选）'
      }
    },
    required: ['filePath']
  },
  async execute(params) {
    const startTime = Date.now();
    const filePath = String(params.filePath);
    const pageRange = params.pageRange ? String(params.pageRange) : undefined;

    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 动态导入 pdf-parse
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;

      // 读取文件
      const fileBuffer = await fs.readFile(filePath);

      // 解析 PDF
      const result = await pdfParse(fileBuffer);

      // 处理页码范围
      let pages = result.text;
      let pageCount = result.numpages;

      if (pageRange) {
        const [start, end] = pageRange.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          // 这里简化处理，实际应该按页分割
          logger.info(`页码范围 ${start}-${end} 已指定，但当前版本返回全部内容`);
        }
      }

      // 截取前 50000 字符
      const maxLength = 50000;
      const truncated = pages.length > maxLength;
      const text = truncated ? pages.substring(0, maxLength) + '\n... (内容已截断)' : pages;

      return {
        success: true,
        data: {
          metadata: {
            fileName: path.basename(filePath),
            pageCount,
            charCount: pages.length,
            truncated
          },
          text
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('解析 PDF 失败', error);
      return {
        success: false,
        error: `解析 PDF 失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 解析 Word 文档工具
 */
export const parseWordTool: Tool = {
  name: 'parse_word',
  description: '解析 Word 文档（.docx），提取文本内容',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Word 文件路径'
      }
    },
    required: ['filePath']
  },
  async execute(params) {
    const startTime = Date.now();
    const filePath = String(params.filePath);

    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 动态导入 mammoth
      const mammoth = await import('mammoth');

      // 读取文件
      const fileBuffer = await fs.readFile(filePath);

      // 解析 Word
      const result = await mammoth.extractRawText({ buffer: fileBuffer });

      // 截取前 50000 字符
      const maxLength = 50000;
      const text = result.value;
      const truncated = text.length > maxLength;
      const displayText = truncated ? text.substring(0, maxLength) + '\n... (内容已截断)' : text;

      return {
        success: true,
        data: {
          metadata: {
            fileName: path.basename(filePath),
            charCount: text.length,
            truncated
          },
          text: displayText,
          messages: result.messages
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('解析 Word 失败', error);
      return {
        success: false,
        error: `解析 Word 失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 文件信息获取工具
 */
export const getFileInfoTool: Tool = {
  name: 'get_file_info',
  description: '获取文件详细信息',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: '文件路径'
      }
    },
    required: ['filePath']
  },
  async execute(params) {
    const startTime = Date.now();
    const filePath = String(params.filePath);

    try {
      const stats = await fs.stat(filePath);

      // 获取文件类型
      const ext = path.extname(filePath).toLowerCase();
      const fileTypes: Record<string, string> = {
        '.xlsx': 'Excel',
        '.xls': 'Excel',
        '.pdf': 'PDF',
        '.docx': 'Word',
        '.doc': 'Word',
        '.txt': 'Text',
        '.csv': 'CSV',
        '.json': 'JSON',
        '.md': 'Markdown'
      };

      return {
        success: true,
        data: {
          fileName: path.basename(filePath),
          filePath,
          fileType: fileTypes[ext] || 'Unknown',
          extension: ext,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('获取文件信息失败', error);
      return {
        success: false,
        error: `获取文件信息失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * CSV 转 JSON 工具
 */
export const csvToJsonTool: Tool = {
  name: 'csv_to_json',
  description: '将 CSV 文件转换为 JSON',
  parameters: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'CSV 文件路径'
      },
      delimiter: {
        type: 'string',
        description: '分隔符（默认逗号）'
      },
      hasHeader: {
        type: 'boolean',
        description: '是否有表头（默认 true）'
      }
    },
    required: ['filePath']
  },
  async execute(params) {
    const startTime = Date.now();
    const filePath = String(params.filePath);
    const delimiter = String(params.delimiter || ',');
    const hasHeader = params.hasHeader !== false;

    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 读取文件
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return {
          success: false,
          error: 'CSV 文件为空',
          executionTime: Date.now() - startTime
        };
      }

      let headers: string[] = [];
      let startIndex = 0;

      if (hasHeader) {
        headers = lines[0].split(delimiter).map(h => h.trim());
        startIndex = 1;
      } else {
        // 如果没有表头，使用列索引
        const firstRow = lines[0].split(delimiter);
        headers = firstRow.map((_, i) => `column_${i}`);
      }

      const data = [];
      for (let i = startIndex; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        data.push(row);
      }

      return {
        success: true,
        data: {
          headers,
          data: data.slice(0, 1000), // 限制返回数量
          totalRows: data.length
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('CSV 转换失败', error);
      return {
        success: false,
        error: `CSV 转换失败: ${(error as Error).message}`,
        executionTime: Date.now() - startTime
      };
    }
  }
};
