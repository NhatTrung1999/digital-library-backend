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
    const [rows] = await this.db.query(
      `
      SELECT *
      FROM Colors
      WHERE ColorStatus = 1
      ORDER BY ColorName
      `,
    );
    return rows;
  }

  async create(dto: CreateColorDto, userId: string) {
    const exists = await this.checkColorCodeExists(dto.colorCode);
    if (exists) {
      throw new BadRequestException('ColorCode already exists');
    }

    try {
      const [rows] = await this.db.query(
        `
        INSERT INTO Colors (
          ColorName, ColorCode, RGBValue, CMYKValue,
          Reference, ColorGroup, Thumbnail, CreatedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          :colorName, :colorCode, :rgbValue, :cmykValue,
          :reference, :colorGroup, :thumbnail, :createdBy
        )
        `,
        {
          replacements: {
            colorName: dto.colorName,
            colorCode: dto.colorCode,
            rgbValue: dto.rgbValue ?? null,
            cmykValue: dto.cmykValue ?? null,
            reference: dto.reference ?? null,
            colorGroup: dto.colorGroup ?? null,
            thumbnail: dto.thumbnail ?? null,
            createdBy: userId,
          },
        },
      );

      return (rows as any[])[0];
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(colorId: string, dto: UpdateColorDto, userId: string) {
    const [rows] = await this.db.query(
      `
      UPDATE Colors
      SET
        ColorName   = ISNULL(:colorName, ColorName),
        RGBValue    = ISNULL(:rgbValue, RGBValue),
        CMYKValue   = ISNULL(:cmykValue, CMYKValue),
        Reference   = ISNULL(:reference, Reference),
        ColorGroup  = ISNULL(:colorGroup, ColorGroup),
        Thumbnail   = ISNULL(:thumbnail, Thumbnail),
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
          reference: dto.reference ?? null,
          colorGroup: dto.colorGroup ?? null,
          thumbnail: dto.thumbnail ?? null,
          colorStatus: dto.colorStatus ?? null,
          updatedBy: userId,
        },
      },
    );

    if (!(rows as any[]).length) {
      throw new NotFoundException('Color not found');
    }

    return (rows as any[])[0];
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
