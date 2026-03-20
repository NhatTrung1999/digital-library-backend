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
}
