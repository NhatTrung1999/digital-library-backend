import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { CreateMenuMgmtDto } from './dto/create-menu-mgmt.dto';
import { UpdateMenuMgmtDto } from './dto/update-menu-mgmt.dto';

@Injectable()
export class MenuMgmtService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async findAll() {
    try {
      return await this.db.query(
        `SELECT 
             m.*,
             mo.Name_EN ModuleName
           FROM Menu m
           LEFT JOIN Module mo ON m.ModuleID = mo.ModuleID
           WHERE m.IsDeleted = 0`,
        { type: QueryTypes.SELECT },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Lấy danh sách Menu thất bại: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      const result = await this.db.query(
        `SELECT 
             m.*
           FROM Menu m
           LEFT JOIN Module mo ON m.ModuleID = mo.ModuleID
           WHERE m.MenuID = :id AND m.IsDeleted = 0`,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        },
      );

      if (!result.length) {
        throw new NotFoundException(`Menu với ID "${id}" không tồn tại`);
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Lấy Menu thất bại: ${error.message}`,
      );
    }
  }

  async create(dto: CreateMenuMgmtDto, userId: string) {
    try {
      await this.db.query(
        `INSERT INTO Menu (MenuID, ModuleID, Name_EN, Name_VN, Name_CN, Status, CreatedAt, CreatedBy, IsDeleted)
         VALUES (NEWID(), :ModuleID, :Name_EN, :Name_VN, :Name_CN, 1, GETDATE(), :CreatedBy, 0)`,
        {
          replacements: {
            ModuleID: dto.ModuleID,
            Name_EN: dto.Name_EN,
            Name_VN: dto.Name_VN,
            Name_CN: dto.Name_CN,
            CreatedBy: userId,
          },
          type: QueryTypes.INSERT,
        },
      );

      // Trả về record vừa tạo
      const created = await this.db.query(
        `SELECT 
             m.*
           FROM Menu m
           LEFT JOIN Module mo ON m.ModuleID = mo.ModuleID
           WHERE m.CreatedBy = :userId 
             AND m.IsDeleted = 0
             AND m.Name_EN = :Name_EN
           ORDER BY m.CreatedAt DESC
           OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`,
        {
          replacements: { userId, Name_EN: dto.Name_EN },
          type: QueryTypes.SELECT,
        },
      );

      return created[0];
    } catch (error) {
      throw new InternalServerErrorException(
        `Tạo Menu thất bại: ${error.message}`,
      );
    }
  }

  async update(id: string, dto: UpdateMenuMgmtDto, userId: string) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE Menu
         SET Name_EN = :Name_EN,
             Name_VN = :Name_VN,
             Name_CN = :Name_CN,
             Status = :Status,
             UpdatedAt = GETDATE(),
             UpdatedBy = :UpdatedBy
         WHERE MenuID = :id AND IsDeleted = 0`,
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
        `Cập nhật Menu thất bại: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      const menu = await this.findOne(id);

      await this.db.query(
        `UPDATE Menu
         SET IsDeleted = 1,
             DeletedAt = GETDATE(),
             DeletedBy = :deletedBy
         WHERE MenuID = :id`,
        {
          replacements: { id, deletedBy: userId },
          type: QueryTypes.UPDATE,
        },
      );

      return menu;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Xóa Menu thất bại: ${error.message}`,
      );
    }
  }
}
