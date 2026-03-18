import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CreateModuleMgmtDto } from './dto/create-module-mgmt.dto';
import { UpdateModuleMgmtDto } from './dto/update-module-mgmt.dto';

@Injectable()
export class ModuleMgmtService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async findAll() {
    try {
      return await this.db.query(`SELECT * FROM Module WHERE IsDeleted = 0`, {
        type: QueryTypes.SELECT,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Lấy danh sách Module thất bại: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      const result = await this.db.query(
        `SELECT * FROM Module WHERE ModuleID = :id AND IsDeleted = 0`,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        },
      );

      if (!result.length) {
        throw new NotFoundException(`Module với ID "${id}" không tồn tại`);
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Lấy Module thất bại: ${error.message}`,
      );
    }
  }

  async create(dto: CreateModuleMgmtDto, userId: string) {
    try {
      await this.db.query(
        `INSERT INTO Module (ModuleID, Name_EN, Name_VN, Name_CN, Status, CreatedAt, CreatedBy, IsDeleted)
         VALUES (NEWID(), :Name_EN, :Name_VN, :Name_CN, 1, GETDATE(), :CreatedBy, 0)`,
        {
          replacements: {
            Name_EN: dto.Name_EN,
            Name_VN: dto.Name_VN,
            Name_CN: dto.Name_CN,
            CreatedBy: userId,
          },
          type: QueryTypes.INSERT,
        },
      );

      const created = await this.db.query(
        `SELECT TOP 1 * FROM Module
         WHERE CreatedBy = :userId
           AND Name_EN = :Name_EN
           AND IsDeleted = 0
         ORDER BY CreatedAt DESC`,
        {
          replacements: { userId, Name_EN: dto.Name_EN },
          type: QueryTypes.SELECT,
        },
      );

      return created[0];
    } catch (error) {
      throw new InternalServerErrorException(
        `Tạo Module thất bại: ${error.message}`,
      );
    }
  }

  async update(id: string, dto: UpdateModuleMgmtDto, userId: string) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE Module
         SET Name_EN = :Name_EN,
             Name_VN = :Name_VN,
             Name_CN = :Name_CN,
             Status = :Status,
             UpdatedAt = GETDATE(),
             UpdatedBy = :UpdatedBy
         WHERE ModuleID = :id AND IsDeleted = 0`,
        {
          replacements: {
            id,
            Name_EN: dto.Name_EN,
            Name_VN: dto.Name_VN,
            Name_CN: dto.Name_CN,
            Status: dto.Status ?? 1,
            UpdatedBy: userId,
          },
          type: QueryTypes.UPDATE,
        },
      );

      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Cập nhật Module thất bại: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      const module = await this.findOne(id);

      const menus = await this.db.query(
        `SELECT COUNT(*) AS total FROM Menu WHERE ModuleID = :id AND IsDeleted = 0`,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        },
      );

      const total = (menus[0] as any).total;
      if (total > 0) {
        throw new BadRequestException(
          `Module này còn ${total} Menu đang hoạt động. Vui lòng xóa Menu trước khi xóa Module.`,
        );
      }

      await this.db.query(
        `UPDATE Module
         SET IsDeleted = 1,
             DeletedAt = GETDATE(),
             DeletedBy = :deletedBy
         WHERE ModuleID = :id`,
        {
          replacements: { id, deletedBy: userId },
          type: QueryTypes.UPDATE,
        },
      );

      return module;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Xóa Module thất bại: ${error.message}`,
      );
    }
  }
}
