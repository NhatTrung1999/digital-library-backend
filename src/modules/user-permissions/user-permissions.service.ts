import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UserPermissionsService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async findAll(userId: string) {
    try {
      return await this.db.query(
        `SELECT 
           up.PermissionID,
           up.Level,
           up.MenuID,
           up.ModuleID,
           m.Name_EN  AS MenuName,
           mo.Name_EN AS ModuleName
         FROM UserPermissions up
         JOIN Menu m    ON m.MenuID    = up.MenuID
         JOIN Module mo ON mo.ModuleID = up.ModuleID
         WHERE up.UserID = :userId`,
        {
          replacements: { userId },
          type: QueryTypes.SELECT,
        },
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Lấy danh sách quyền thất bại: ${error.message}`,
      );
    }
  }

  async savePermission(
    dto: { userId: string; menuId: string; moduleId: string; level: number },
    createdBy: string,
  ) {
    try {
      const [existing]: any = await this.db.query(
        `SELECT PermissionID
         FROM UserPermissions
         WHERE UserID   = :userId
           AND MenuID   = :menuId
           AND ModuleID = :moduleId`,
        {
          replacements: {
            userId: dto.userId,
            menuId: dto.menuId,
            moduleId: dto.moduleId,
          },
          type: QueryTypes.SELECT,
        },
      );

      if (existing) {
        await this.db.query(
          `UPDATE UserPermissions
           SET Level     = :level,
               UpdatedAt = GETDATE(),
               UpdatedBy = :updatedBy
           WHERE UserID   = :userId
             AND MenuID   = :menuId
             AND ModuleID = :moduleId`,
          {
            replacements: {
              userId: dto.userId,
              menuId: dto.menuId,
              moduleId: dto.moduleId,
              level: dto.level,
              updatedBy: createdBy,
            },
            type: QueryTypes.UPDATE,
          },
        );
      } else {
        await this.db.query(
          `INSERT INTO UserPermissions
             (PermissionID, UserID, ModuleID, MenuID, Level, CreatedBy)
           VALUES
             (NEWID(), :userId, :moduleId, :menuId, :level, :createdBy)`,
          {
            replacements: {
              userId: dto.userId,
              menuId: dto.menuId,
              moduleId: dto.moduleId,
              level: dto.level,
              createdBy: createdBy,
            },
            type: QueryTypes.INSERT,
          },
        );
      }

      const data = await this.db.query(
        `SELECT
           up.*,
           m.Name_EN  AS MenuName,
           mo.Name_EN AS ModuleName
         FROM UserPermissions up
         JOIN Menu m    ON m.MenuID    = up.MenuID
         JOIN Module mo ON mo.ModuleID = up.ModuleID
         WHERE up.UserID   = :userId
           AND up.MenuID   = :menuId
           AND up.ModuleID = :moduleId`,
        {
          replacements: {
            userId: dto.userId,
            menuId: dto.menuId,
            moduleId: dto.moduleId,
          },
          type: QueryTypes.SELECT,
        },
      );

      return {
        message: existing
          ? 'Cập nhật quyền thành công'
          : 'Tạo quyền thành công',
        data: data[0],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Lưu quyền thất bại: ${error.message}`,
      );
    }
  }
}
