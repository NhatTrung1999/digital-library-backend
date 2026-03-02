import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UsersService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async checkExist(username: string, email: string): Promise<boolean> {
    const [rows] = await this.db.query(
      `
      SELECT 1
      FROM Users
      WHERE Username = :username OR Email = :email
      `,
      { replacements: { username, email } },
    );

    return (rows as any[]).length > 0;
  }

  async createUser(
    data: {
      username: string;
      email: string;
      passwordHash: string;
      fullName?: string;
      vendorCode?: string;
    },
    transaction: Transaction,
  ): Promise<string> {
    const [result] = await this.db.query(
      `
      INSERT INTO Users (
        VendorCode,
        Username,
        Email,
        PasswordHash,
        FullName
      )
      OUTPUT INSERTED.UserID
      VALUES (
        :vendorCode,
        :username,
        :email,
        :passwordHash,
        :fullName
      )
      `,
      {
        replacements: {
          vendorCode: data.vendorCode ?? null,
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName ?? null,
        },
        transaction,
      },
    );

    return (result as any[])[0].UserID;
  }

  async assignRole(userId: string, roleCode: string, transaction: Transaction) {
    await this.db.query(
      `
      INSERT INTO UserRoles (UserID, RoleID)
      SELECT :userId, RoleID
      FROM Roles
      WHERE RoleCode = :roleCode
      `,
      {
        replacements: { userId, roleCode },
        transaction,
      },
    );
  }

  async findByUsername(username: string) {
    const [rows] = await this.db.query(
      `
      SELECT *
      FROM Users
      WHERE Username = :username
      `,
      { replacements: { username } },
    );

    return (rows as any[])[0];
  }
}
