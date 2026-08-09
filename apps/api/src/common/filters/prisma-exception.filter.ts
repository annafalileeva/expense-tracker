import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@expence-tracker/database';
import type { Response } from 'express';

/**
 * Переводит коды ошибок Prisma в осмысленные HTTP-статусы,
 * чтобы фронтенд не получал 500 на нарушение уникальности.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const { status, message } = this.map(exception);
    this.logger.warn(`Prisma ${exception.code}: ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.code,
    });
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: 'Запись с такими данными уже существует' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Запись не найдена' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, message: 'Нарушена ссылочная целостность' };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при обращении к базе данных',
        };
    }
  }
}
