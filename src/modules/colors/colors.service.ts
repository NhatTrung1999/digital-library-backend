import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { Sequelize } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ColorsService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async checkColorCodeExists(colorCode: string): Promise<boolean> {
    const [rows] = await this.db.query(
      `
      SELECT 1 FROM Colors
      WHERE ColorCode = :colorCode
    `,
      { replacements: { colorCode } },
    );

    return (rows as any[]).length > 0;
  }

  async findAll() {
    const [rows] = (await this.db.query(
      `
      SELECT
      c.ColorID,
      c.ColorName,
      c.ColorCode,
      c.RGBValue,
      c.CMYKValue,
      c.ColorGroup,
      c.ColorStatus,
      c.CreatedAt,
      c.UpdatedAt,
      (
        SELECT
          ImageID,
          ImagePath
        FROM ColorImages ci
        WHERE ci.ColorID = c.ColorID
        FOR JSON PATH
      ) AS Images
    FROM Colors c
    ORDER BY c.CreatedAt DESC
      `,
    )) as [any[], unknown];
    return rows.map((item) => ({
      ...item,
      Images: item.Images ? JSON.parse(item.Images) : [],
    }));
  }

  async create(
    dto: CreateColorDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const transaction = await this.db.transaction();
    const exists = await this.checkColorCodeExists(dto.colorCode);
    if (exists) {
      throw new BadRequestException('ColorCode already exists');
    }

    try {
      const [colors] = await this.db.query(
        `
        INSERT INTO Colors (
          ColorName, ColorCode, RGBValue, CMYKValue, ColorGroup, CreatedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          :colorName, :colorCode, :rgbValue, :cmykValue, :colorGroup, :createdBy
        )
        `,
        {
          replacements: {
            colorName: dto.colorName,
            colorCode: dto.colorCode,
            rgbValue: dto.rgbValue ?? null,
            cmykValue: dto.cmykValue ?? null,
            colorGroup: dto.colorGroup ?? null,
            createdBy: userId,
          },
        },
      );

      const color = (colors as any[])[0];

      if (files?.length) {
        const values = files
          .map(
            (f, i) => `(
              '${color.ColorID}',
              '${f.filename}',
              ${i},
              ${userId ? `'${userId}'` : 'NULL'}
            )`,
          )
          .join(',');

        await this.db.query(
          `
          INSERT INTO ColorImages
            (ColorID, ImagePath, SortOrder, CreatedBy)
          VALUES ${values}
          `,
          { transaction },
        );
      }

      const [images] = await this.db.query(
        `SELECT ImagePath, SortOrder
         FROM ColorImages
         WHERE ColorID = :id
         ORDER BY SortOrder`,
        { replacements: { id: color.ColorID }, transaction },
      );

      await transaction.commit();

      return {
        ...color,
        images,
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(
    colorId: string,
    dto: UpdateColorDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const transaction = await this.db.transaction();
    const uploadedFiles: string[] = [];
    try {
      const [updated] = await this.db.query(
        `
        UPDATE Colors
        SET
          ColorName   = ISNULL(:colorName, ColorName),
          RGBValue    = ISNULL(:rgbValue, RGBValue),
          CMYKValue   = ISNULL(:cmykValue, CMYKValue),
          ColorGroup  = ISNULL(:colorGroup, ColorGroup),
          ColorStatus = ISNULL(:colorStatus, ColorStatus),
          UpdatedAt   = SYSDATETIME(),
          UpdatedBy   = :updatedBy
        OUTPUT INSERTED.*
        WHERE ColorID = :colorId
        `,
        {
          replacements: {
            colorId,
            colorName: dto.colorName ?? null,
            rgbValue: dto.rgbValue ?? null,
            cmykValue: dto.cmykValue ?? null,
            // reference: dto.reference ?? null,
            colorGroup: dto.colorGroup ?? null,
            // thumbnail: dto.thumbnail ?? null,
            colorStatus: dto.colorStatus ?? null,
            updatedBy: userId,
          },
        },
      );

      if (!(updated as any[]).length) {
        throw new NotFoundException('Color not found');
      }

      const imageIds = dto.imageIds
        ? dto.imageIds.split(',').map((i) => i.trim())
        : [];

      for (let i = 0; i < (files ?? []).length; i++) {
        const file = files[i];
        uploadedFiles.push(file.path);
        const imageId = imageIds[i] ?? null;

        if (imageId) {
          const [old] = await this.db.query(
            `SELECT ImagePath FROM ColorImages WHERE ImageID = :imageId`,
            { transaction, replacements: { imageId } },
          );

          const images = old as { ImagePath: string }[];

          if (images.length) {
            const oldPath = `./uploads/colors/${images[0].ImagePath}`;
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }

          await this.db.query(
            `
                UPDATE ColorImages
                SET ImagePath = :path
                WHERE ImageID = :imageId
                `,
            {
              transaction,
              replacements: {
                imageId,
                path: file.filename,
              },
            },
          );
        } else {
          await this.db.query(
            `
                INSERT INTO ColorImages (
                  ImageID, ColorID, ImagePath, CreatedAt, CreatedBy
                )
                VALUES (
                  NEWID(), :colorId, :path, SYSDATETIME(), :createdBy
                )
                `,
            {
              transaction,
              replacements: {
                colorId,
                path: `/uploads/colors/${file.filename}`,
                createdBy: userId,
              },
            },
          );
        }
      }
      await transaction.commit();
      return updated[0];
    } catch (error) {
      await transaction.rollback();

      for (const path of uploadedFiles) {
        if (fs.existsSync(path)) fs.unlinkSync(path);
      }
      throw new InternalServerErrorException(
        error?.message || 'Update color failed',
      );
    }
  }

  async remove(colorId: string, userId: string) {
    const [rows] = await this.db.query(
      `
      UPDATE Colors
      SET
        ColorStatus = 0,
        UpdatedAt = SYSDATETIME(),
        UpdatedBy = :updatedBy
      OUTPUT INSERTED.ColorID
      WHERE ColorID = :colorId AND ColorStatus = 1
      `,
      {
        replacements: {
          colorId,
          updatedBy: userId,
        },
      },
    );

    if (!(rows as any[]).length) {
      throw new NotFoundException('Color not found or already deleted');
    }

    return {
      id: colorId,
      message: 'Deleted successfully',
    };
  }
}
