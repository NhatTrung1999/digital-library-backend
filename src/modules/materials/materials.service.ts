import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Sequelize } from 'sequelize-typescript';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import * as QRCode from 'qrcode';
import { Response } from 'express';

@Injectable()
export class MaterialsService {
  constructor(
    @Inject('LYG_DL') private readonly db: Sequelize,
    private readonly configService: ConfigService,
  ) {}

  private normalizeDto(dto: any) {
    const data = {};
    Object.keys(dto).forEach((key) => {
      data[key] = dto[key] ?? null;
    });
    return data;
  }

  private buildWhereCondition(query: any) {
    const searchableFields: Record<string, string> = {
      materialID: 'Material_ID',
      vendorCode: 'Vendor_Code',
      supplier: 'Supplier',
      supplierMaterialID: 'Supplier_Material_ID',
      supplierMaterialName: 'Supplier_Material_Name',
      mtlSuppLifecycleState: 'Mtl_Supp_Lifecycle_State',
      materialTypeLevel1: 'Material_Type_Level_1',
      composition: 'Composition',
      classification: 'Classification',
      materialThickness: 'Material_Thickness',
      materialThicknessUom: 'Material_Thickness_UOM',
      comparisonUom: 'Comparison_UOM',
      priceRemark: 'Price_Remark',
      skinSize: 'Skin_Size',
      qCPercent: 'QC_Percent',
      leadtime: 'Leadtime',
      sampleLeadtime: 'Sample_Leadtime',
      minQtyColor: 'Min_Qty_Color',
      minQtySample: 'Min_Qty_Sample',
      productionLocation: 'Production_Location',
      termsOfDeliveryperT1Country: 'Terms_of_Delivery_per_T1_Country',
      validFromPrice: 'Valid_From_Price',
      validToPrice: 'Valid_To_Price',
      priceType: 'Price_Type',
      colorCodePrice: 'Color_Code_Price',
      colorPrice: 'Color_Price',
      treatmentPrice: 'Treatment_Price',
      widthPrice: 'Width_Price',
      widthUomPrice: 'Width_Uom_Price',
      lengthPrice: 'Length_Price',
      lengthUomPrice: 'Length_Uom_Price',
      thicknessPrice: 'Thickness_Price',
      thicknessUomPrice: 'Thickness_Uom_Price',
      diameterInsidePrice: 'Diameter_Inside_Price',
      diameterInsideUomPrice: 'Diameter_Inside_Uom_Price',
      weightPrice: 'Weight_Price',
      weightUomPrice: 'Weight_Uom_Price',
      quantityPrice: 'Quantity_Price',
      quantityUomPrice: 'Quantity_Uom_Price',
      uomStringPrice: 'Uom_String_Price',
      sS26FinalPriceUSD: 'SS26_Final_Price_USD',
      comparisonPricePriceUSD: 'Comparison_Price_Price_USD',
      approvedAsFinalPriceYNPrice: 'Approved_As_Final_Price_Y_N_Price',
      season: 'Season',
    };

    const whereConditions: string[] = ['m.IsDeleted = 0'];
    const replacements: any = {};

    Object.keys(searchableFields).forEach((key) => {
      if (query[key]) {
        const column = searchableFields[key];
        if (column === 'Material_ID') {
          whereConditions.push(
            `m.${column} IN (${query[key]
              .split(',')
              .map((item) => `'${item?.trim()}'`)
              .join(',')})`,
          );
        } else if (column === 'Classification') {
          whereConditions.push(`m.${column} = :${key}`);
          replacements[key] = `${query[key]}`;
        } else {
          whereConditions.push(`m.${column} LIKE :${key}`);
          replacements[key] = `%${query[key]}%`;
        }
      }
    });

    if (query.hasImage === 'true') {
      whereConditions.push(`
        EXISTS (
          SELECT 1
          FROM MaterialImages mi
          WHERE mi.MaterialID = m.ID
          AND mi.IsDeleted = 0
        )
      `);
    }

    if (query.hasImage === 'false') {
      whereConditions.push(`
        NOT EXISTS (
          SELECT 1
          FROM MaterialImages mi
          WHERE mi.MaterialID = m.ID
          AND mi.IsDeleted = 0
        )
      `);
    }

    return {
      whereSql: whereConditions.join('\n AND '),
      replacements,
    };
  }

  async checkMaterialExists(
    materialID: string,
    priceType: string,
    finalPrice: string,
  ): Promise<boolean> {
    const [rows] = await this.db.query(
      `
      SELECT 1
      FROM Materials
      WHERE Material_ID = :materialID
        AND Price_Type = :priceType
        AND SS26_Final_Price_USD = :finalPrice
        AND IsDeleted = 0
      `,
      {
        replacements: { materialID, priceType, finalPrice },
      },
    );

    return (rows as any[]).length > 0;
  }

  async findAll(query: any) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;

      const sort = query.sort || 'CreatedAt';
      const order = query.order === 'ASC' ? 'ASC' : 'DESC';

      const { whereSql, replacements } = this.buildWhereCondition(query);

      const [[countResult]]: any = await this.db.query(
        `
        SELECT COUNT(*) as total
        FROM Materials m
        WHERE ${whereSql}
        `,
        { replacements },
      );

      const total = countResult.total;

      const [rows] = await this.db.query(
        `
        SELECT
          m.*,
          f.FileID,
          f.FileName,
          f.FilePath,
          (
            SELECT ImageID, ImagePath, ImageType
            FROM MaterialImages mi
            WHERE mi.MaterialID = m.ID
            AND mi.IsDeleted = 0
            FOR JSON PATH
          ) AS Images
  
        FROM Materials m
  
        LEFT JOIN MaterialTestReport f
          ON f.FileID = m.ID
          AND f.IsDeleted = 0
  
        WHERE ${whereSql}
  
        ORDER BY m.${sort} ${order}
        OFFSET :offset ROWS
        FETCH NEXT :limit ROWS ONLY
        `,
        {
          replacements: {
            ...replacements,
            offset,
            limit,
          },
        },
      );

      const baseUrl = this.configService.get<string>('BASE_URL');

      const data = (rows as any[]).map((item) => {
        const images = item.Images ? JSON.parse(item.Images) : [];
        const fileUrl = item.FilePath
          ? `${baseUrl}/uploads/materialtestreport/${item.FilePath.replace(/\\/g, '/')}`
          : null;

        return {
          ...item,
          FilePath: fileUrl,
          Images: images.map((img: any) => ({
            ...img,
            ImagePath: `${baseUrl}/uploads/materials/${img.ImagePath}`,
          })),
        };
      });

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Fetch materials failed',
      );
    }
  }

  async create(
    dto: CreateMaterialDto,
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    userId: string,
  ) {
    const transaction = await this.db.transaction();

    const exists = await this.checkMaterialExists(
      dto.materialID || '',
      dto.priceType || '',
      dto.sS26FinalPriceUSD || '',
    );

    if (exists) {
      throw new BadRequestException(
        'Material already exists (Material_ID + Price_TYPE + SS26_Final_Price_USD)',
      );
    }

    try {
      const [materials] = await this.db.query(
        `
        INSERT INTO Materials (
          Unique_Price_ID,
          Material_ID,
          Vendor_Code,
          Supplier,
          Supplier_Material_ID,
          Supplier_Material_Name,
          Mtl_Supp_Lifecycle_State,
          Material_Type_Level_1,
          Composition,
          Classification,
          Material_Thickness,
          Material_Thickness_UOM,
          Comparison_UOM,
          Price_Remark,
          Skin_Size,
          QC_Percent,
          Leadtime,
          Sample_Leadtime,
          Min_Qty_Color,
          Min_Qty_Sample,
          Production_Location,
          Terms_of_Delivery_per_T1_Country,
          Valid_From_Price,
          Valid_To_Price,
          Price_Type,
          Color_Code_Price,
          Color_Price,
          Treatment_Price,
          Width_Price,
          Width_Uom_Price,
          Length_Price,
          Length_Uom_Price,
          Thickness_Price,
          Thickness_Uom_Price,
          Diameter_Inside_Price,
          Diameter_Inside_Uom_Price,
          Weight_Price,
          Weight_Uom_Price,
          Quantity_Price,
          Quantity_Uom_Price,
          Uom_String_Price,
          SS26_Final_Price_USD,
          Comparison_Price_Price_USD,
          Approved_As_Final_Price_Y_N_Price,
          Season,
          CreatedBy
        )
        OUTPUT INSERTED.*
        VALUES (
          :uniquePriceID,
          :materialID,
          :vendorCode,
          :supplier,
          :supplierMaterialID,
          :supplierMaterialName,
          :mtlSuppLifecycleState,
          :materialTypeLevel1,
          :composition,
          :classification,
          :materialThickness,
          :materialThicknessUOM,
          :comparisonUOM,
          :priceRemark,
          :skinSize,
          :qCPercent,
          :leadtime,
          :sampleLeadtime,
          :minQtyColor,
          :minQtySample,
          :productionLocation,
          :termsofDeliveryperT1Country,
          :validFromPrice,
          :validToPrice,
          :priceType,
          :colorCodePrice,
          :colorPrice,
          :treatmentPrice,
          :widthPrice,
          :widthUomPrice,
          :lengthPrice,
          :lengthUomPrice,
          :thicknessPrice,
          :thicknessUomPrice,
          :diameterInsidePrice,
          :diameterInsideUomPrice,
          :weightPrice,
          :weightUomPrice,
          :quantityPrice,
          :quantityUomPrice,
          :uomStringPrice,
          :sS26FinalPriceUSD,
          :comparisonPricePriceUSD,
          :approvedAsFinalPriceYNPrice,
          :season,
          :createdBy
        )
        `,
        {
          replacements: {
            ...this.normalizeDto(dto),
            createdBy: userId,
          },
          transaction,
        },
      );

      const material = (materials as any[])[0];

      const topImage = files.topImage?.[0];
      const bottomImage = files.bottomImage?.[0];
      const values: string[] = [];

      if (topImage) {
        values.push(`(
          '${material.ID}',
          '${topImage.filename}',
          'TopSide',
          '${userId}'
        )`);
      }

      if (bottomImage) {
        values.push(`(
          '${material.ID}',
          '${bottomImage.filename}',
          'BottomSide',
          '${userId}'
        )`);
      }

      if (values.length) {
        await this.db.query(
          `
            INSERT INTO MaterialImages
            (MaterialID, ImagePath, ImageType, CreatedBy)
            VALUES ${values.join(',')}
          `,
          { transaction },
        );
      }
      // if (files?.length) {
      //   const values = files
      //     .map(
      //       (f) => `(
      //         '${material.ID}',
      //         '${f.filename}',
      //         '${userId}'
      //       )`,
      //     )
      //     .join(',');

      //   await this.db.query(
      //     `
      //     INSERT INTO MaterialImages
      //       (MaterialID, ImagePath, CreatedBy)
      //     VALUES ${values}
      //     `,
      //     { transaction },
      //   );
      // }

      const [images] = await this.db.query(
        `
        SELECT ImageID, ImagePath, ImageType
        FROM MaterialImages
        WHERE MaterialID = :id
        AND IsDeleted = 0
        `,
        {
          replacements: { id: material.ID },
          transaction,
        },
      );

      const baseUrl = this.configService.get<string>('BASE_URL');

      await transaction.commit();

      return {
        ...material,
        Images: (images as any[]).map((img) => ({
          ...img,
          ImagePath: `${baseUrl}/uploads/materials/${img.ImagePath}`,
        })),
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(
    materialId: string,
    dto: UpdateMaterialDto,
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    userId: string,
  ) {
    const transaction = await this.db.transaction();
    const uploadedFiles: string[] = [];

    try {
      const [updated] = await this.db.query(
        `
        UPDATE Materials
        SET
          Material_ID                       = :materialID,
          Vendor_Code                       = :vendorCode,
          Supplier                          = :supplier,
          Supplier_Material_ID              = :supplierMaterialID,
          Supplier_Material_Name            = :supplierMaterialName,
          Mtl_Supp_Lifecycle_State          = :mtlSuppLifecycleState,
          Material_Type_Level_1             = :materialTypeLevel1,
          Composition                       = :composition,
          Classification                    = :classification,
          Material_Thickness                = :materialThickness,
          Material_Thickness_UOM            = :materialThicknessUOM,
          Comparison_UOM                    = :comparisonUOM,
          Price_Remark                      = :priceRemark,
          Skin_Size                         = :skinSize,
          QC_Percent                        = :qCPercent,
          Leadtime                          = :leadtime,
          Sample_Leadtime                   = :sampleLeadtime,
          Min_Qty_Color                     = :minQtyColor,
          Min_Qty_Sample                    = :minQtySample,
          Production_Location               = :productionLocation,
          Terms_of_Delivery_per_T1_Country  = :termsofDeliveryperT1Country,
          Valid_From_Price                   = :validFromPrice,
          Valid_To_Price                     = :validToPrice,
          Price_Type                         = :priceType,
          Color_Code_Price                   = :colorCodePrice,
          Color_Price                        = :colorPrice,
          Treatment_Price                    = :treatmentPrice,
          Width_Price                        = :widthPrice,
          Width_Uom_Price                    = :widthUomPrice,
          Length_Price                       = :lengthPrice,
          Length_Uom_Price                   = :lengthUomPrice,
          Thickness_Price                    = :thicknessPrice,
          Thickness_Uom_Price                = :thicknessUomPrice,
          Diameter_Inside_Price              = :diameterInsidePrice,
          Diameter_Inside_Uom_Price          = :diameterInsideUomPrice,
          Weight_Price                       = :weightPrice,
          Weight_Uom_Price                   = :weightUomPrice,
          Quantity_Price                     = :quantityPrice,
          Quantity_Uom_Price                 = :quantityUomPrice,
          Uom_String_Price                   = :uomStringPrice,
          SS26_Final_Price_USD               = :sS26FinalPriceUSD,
          Comparison_Price_Price_USD         = :comparisonPricePriceUSD,
          Approved_As_Final_Price_Y_N_Price  = :approvedAsFinalPriceYNPrice,
          Season                             = :season,
          UpdatedAt                          = SYSDATETIME(),
          UpdatedBy                          = :updatedBy
        OUTPUT INSERTED.*
        WHERE ID = :materialId AND IsDeleted = 0
        `,
        {
          transaction,
          replacements: {
            materialId,
            ...this.normalizeDto(dto),
            updatedBy: userId,
          },
        },
      );

      if (!(updated as any[]).length) {
        throw new NotFoundException('Material not found');
      }

      const topImage = files?.topImage?.[0];
      const bottomImage = files?.bottomImage?.[0];

      const handleImage = async (
        file: Express.Multer.File,
        type: 'TopSide' | 'BottomSide',
      ) => {
        uploadedFiles.push(file.path);

        const [old] = await this.db.query(
          `
          SELECT ImagePath
          FROM MaterialImages
          WHERE MaterialID = :materialId
          AND ImageType = :type
          AND IsDeleted = 0
          `,
          {
            transaction,
            replacements: { materialId, type },
          },
        );

        const images = old as { ImagePath: string }[];

        if (images.length) {
          const oldPath = `./uploads/materials/${images[0].ImagePath}`;
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

          await this.db.query(
            `
            UPDATE MaterialImages
            SET ImagePath = :path,
                UpdatedAt = SYSDATETIME(),
                UpdatedBy = :updatedBy
            WHERE MaterialID = :materialId
            AND ImageType = :type
            `,
            {
              transaction,
              replacements: {
                path: file.filename,
                updatedBy: userId,
                materialId,
                type,
              },
            },
          );
        } else {
          await this.db.query(
            `
            INSERT INTO MaterialImages (
              ImageID,
              MaterialID,
              ImageType,
              ImagePath,
              CreatedAt,
              CreatedBy
            )
            VALUES (
              NEWID(),
              :materialId,
              :type,
              :path,
              SYSDATETIME(),
              :createdBy
            )
            `,
            {
              transaction,
              replacements: {
                materialId,
                type,
                path: file.filename,
                createdBy: userId,
              },
            },
          );
        }
      };

      if (topImage) {
        await handleImage(topImage, 'TopSide');
      }

      if (bottomImage) {
        await handleImage(bottomImage, 'BottomSide');
      }

      const material = (updated as any[])[0];

      const baseUrl = this.configService.get<string>('BASE_URL');

      const [images] = await this.db.query(
        `
        SELECT ImageID, ImagePath, ImageType
        FROM MaterialImages
        WHERE MaterialID = :id
        AND IsDeleted = 0
        `,
        {
          replacements: { id: material.ID },
          transaction,
        },
      );

      await transaction.commit();

      return {
        ...material,
        Images: (images as any[]).map((img) => ({
          ...img,
          ImagePath: `${baseUrl}/uploads/materials/${img.ImagePath}`,
        })),
      };
    } catch (error) {
      await transaction.rollback();

      for (const path of uploadedFiles) {
        if (fs.existsSync(path)) fs.unlinkSync(path);
      }

      throw new InternalServerErrorException(
        error?.message || 'Update material failed',
      );
    }
  }

  async remove(materialId: string, userId: string) {
    const transaction = await this.db.transaction();

    try {
      const [rows] = await this.db.query(
        `
        UPDATE Materials
        SET IsDeleted = 1,
            DeletedAt = SYSDATETIME(),
            DeletedBy = :userId
        OUTPUT INSERTED.ID
        WHERE ID = :materialId AND IsDeleted = 0
        `,
        {
          replacements: { materialId, userId },
          transaction,
        },
      );

      if (!(rows as any[]).length) {
        throw new NotFoundException('Material not found');
      }

      await this.db.query(
        `
        UPDATE MaterialImages
        SET IsDeleted = 1,
            DeletedAt = SYSDATETIME(),
            DeletedBy = :userId
        WHERE MaterialID = :materialId
        `,
        {
          replacements: { materialId, userId },
          transaction,
        },
      );

      await this.db.query(
        `
        UPDATE MaterialTestReport
        SET IsDeleted = 1,
            DeletedAt = SYSDATETIME(),
            DeletedBy = :userId
        WHERE FileID = :materialId
        `,
        {
          replacements: { materialId, userId },
          transaction,
        },
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Material deleted successfully',
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(error.message);
    }
  }

  async restore(materialId: string, userId: string) {
    const transaction = await this.db.transaction();

    try {
      const [rows] = await this.db.query(
        `
        UPDATE Materials
        SET IsDeleted = 0,
            DeletedAt = SYSDATETIME(),
            DeletedBy = :userId
        OUTPUT INSERTED.ID
        WHERE ID = :materialId AND IsDeleted = 1
        `,
        {
          replacements: { materialId, userId },
          transaction,
        },
      );

      if (!(rows as any[]).length) {
        throw new NotFoundException('Material not found or not deleted');
      }

      await this.db.query(
        `
        UPDATE MaterialImages
        SET IsDeleted = 0,
            DeletedAt = SYSDATETIME(),
            DeletedBy = :userId
        WHERE MaterialID = :materialId
        `,
        {
          replacements: { materialId, userId },
          transaction,
        },
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Material restored',
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeImage(imageId: string) {
    const transaction = await this.db.transaction();

    try {
      const [rows] = await this.db.query(
        `
        SELECT ImagePath
        FROM MaterialImages
        WHERE ImageID = :imageId
        `,
        {
          replacements: { imageId },
          transaction,
        },
      );

      if (!(rows as any[]).length) {
        throw new NotFoundException('Image not found');
      }

      const imagePath = (rows as any[])[0].ImagePath;
      const fullPath = path.join(process.cwd(), 'uploads/materials', imagePath);

      await this.db.query(
        `
        DELETE FROM MaterialImages
        WHERE ImageID = :imageId
        `,
        {
          replacements: { imageId },
          transaction,
        },
      );

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Image deleted',
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(error.message);
    }
  }

  async importExcel(file: Express.Multer.File, userId: string) {
    const transaction = await this.db.transaction();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new BadRequestException('Excel file is empty');
      }

      const headers: string[] = [];
      const rows: any[] = [];

      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text.trim();
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const data: any = {};

        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (!header) return;

          data[header] = cell.text?.trim() || null;
        });

        if (!data.Material_ID) return;

        rows.push(data);
      });

      if (!rows.length) {
        throw new BadRequestException('No valid data found in Excel');
      }

      const columns = Object.keys(rows[0]);

      const columnSql = columns.join(',');
      const valueSql = columns.map((c) => `:${c}`).join(',');

      for (const r of rows) {
        await this.db.query(
          `
          INSERT INTO Materials (
            ${columnSql},
            CreatedAt,
            CreatedBy
          )
          SELECT
            ${valueSql},
            SYSDATETIME(),
            :userId
          --WHERE NOT EXISTS (
          --  SELECT 1 FROM Materials
          --  WHERE Material_ID = :Material_ID
          --  AND Price_Type = :Price_Type
          --  AND SS26_Final_Price_USD = :SS26_Final_Price_USD
          --)
          `,
          {
            replacements: {
              ...r,
              userId,
            },
            transaction,
          },
        );
      }

      await transaction.commit();

      return {
        success: true,
        total: rows.length,
        message: 'Import Excel successfully',
      };
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(
        error?.message || 'Import excel failed',
      );
    }
  }

  async exportExcel(query: any, res: any) {
    try {
      const sort = query.sort || 'CreatedAt';
      const order = query.order === 'ASC' ? 'ASC' : 'DESC';

      const { whereSql, replacements } = this.buildWhereCondition(query);

      const [rows] = await this.db.query(
        `
        SELECT 
          m.Unique_Price_ID,
          m.Material_ID,
          m.Vendor_Code,
          m.Supplier,
          m.Supplier_Material_ID,
          m.Supplier_Material_Name,
          m.Mtl_Supp_Lifecycle_State,
          m.Material_Type_Level_1,
          m.Composition,
          m.Classification,
          m.Material_Thickness,
          m.Material_Thickness_UOM,
          m.Comparison_UOM,
          m.Price_Remark,
          m.Skin_Size,
          m.QC_Percent,
          m.Leadtime,
          m.Sample_Leadtime,
          m.Min_Qty_Color,
          m.Min_Qty_Sample,
          m.Production_Location,
          m.Terms_of_Delivery_per_T1_Country,
          m.Valid_From_Price,
          m.Valid_To_Price,
          m.Price_Type,
          m.Color_Code_Price,
          m.Color_Price,
          m.Treatment_Price,
          m.Width_Price,
          m.Width_Uom_Price,
          m.Length_Price,
          m.Length_Uom_Price,
          m.Thickness_Price,
          m.Thickness_Uom_Price,
          m.Diameter_Inside_Price,
          m.Diameter_Inside_Uom_Price,
          m.Weight_Price,
          m.Weight_Uom_Price,
          m.Quantity_Price,
          m.Quantity_Uom_Price,
          m.Uom_String_Price,
          m.SS26_Final_Price_USD,
          m.Comparison_Price_Price_USD,
          m.Approved_As_Final_Price_Y_N_Price,
          m.Season
        FROM Materials m
        WHERE ${whereSql}
        ORDER BY m.${sort} ${order}
      `,
        { replacements },
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Materials');

      const columns = Object.keys((rows as any[])[0] || {});

      worksheet.columns = columns.map((col) => ({
        header: col.replace(/_/g, ' '),
        key: col,
        width: 25,
      }));

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };

      const headerRow = worksheet.getRow(1);

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: 'FFFFFFFF' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'thin' },
        };
      });

      (rows as any[]).forEach((rowData, index) => {
        const row = worksheet.addRow(rowData);

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'thin' },
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
          };
        });

        if ((index + 2) % 2 === 0) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
          });
        }
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 10;

        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, val.length);
        });

        column.width = maxLength + 3;
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Materials.xlsx',
      );

      await workbook.xlsx.write(res);

      res.end();
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Export excel failed',
      );
    }
  }

  async addFile(file: Express.Multer.File, body: any) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      const fileId = body.fileId;

      const [existing]: any = await this.db.query(
        `
        SELECT ID, FilePath
        FROM MaterialTestReport
        WHERE FileID = ?
        AND IsDeleted = 0
        `,
        { replacements: [fileId] },
      );

      if (existing.length > 0) {
        const oldFile = existing[0];

        if (oldFile.FilePath && fs.existsSync(path.resolve(oldFile.FilePath))) {
          fs.unlinkSync(path.resolve(oldFile.FilePath));
        }

        await this.db.query(
          `
          UPDATE MaterialTestReport
          SET
            FileName = ?,
            FilePath = ?,
            FileType = ?,
            FileSize = ?,
            UpdatedBy = ?,
            UpdatedAt = GETDATE()
          WHERE FileID = ?
          `,
          {
            replacements: [
              file.originalname || null,
              file.filename || null,
              file.mimetype || null,
              file.size || null,
              body.user || null,
              fileId,
            ],
          },
        );
      } else {
        await this.db.query(
          `
          INSERT INTO MaterialTestReport
          (
            FileID,
            FileName,
            FilePath,
            FileType,
            FileSize,
            CreatedBy
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          {
            replacements: [
              fileId || null,
              file.originalname || null,
              file.filename || null,
              file.mimetype || null,
              file.size || null,
              body.user || null,
            ],
          },
        );
      }

      const [rows]: any = await this.db.query(
        `
        SELECT
          m.ID,
          f.FileID,
          f.FileName,
          f.FilePath
        FROM Materials m
        LEFT JOIN MaterialTestReport f
          ON f.FileID = m.ID
          AND f.IsDeleted = 0
  
        WHERE m.ID = ?
        `,
        { replacements: [fileId] },
      );

      const baseUrl = this.configService.get<string>('BASE_URL');

      const item = rows[0];

      const data = {
        ...item,
        FilePath: item.FilePath
          ? `${baseUrl}/uploads/materialtestreport/${item.FilePath.replace(/\\/g, '/')}`
          : null,
      };

      return {
        message:
          existing.length > 0
            ? 'File updated successfully'
            : 'Upload file success',
        data,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Upload file failed',
      );
    }
  }

  //export excel with QR code

  async getList(query: any) {
    const { whereSql, replacements } = this.buildWhereCondition(query);
    const [rows]: any = await this.db.query(
      `
      SELECT
        m.ID,
        m.Supplier,
        m.Supplier_Material_Name,
        m.SS26_Final_Price_USD,
        m.Season,
        m.Material_ID,
        m.Production_Location,
        m.Sample_Leadtime,
        m.Leadtime
      FROM Materials m
      WHERE ${whereSql}
      ORDER BY m.CreatedAt DESC
      `,
      { replacements },
    );
    return rows;
  }

  async exportExcelQR(query: any, res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('In');

    worksheet.views = [{ state: 'normal', zoomScale: 100 }];

    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 1,
      scale: 67,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.25,
        bottom: 0.25,
        header: 0.3,
        footer: 0.3,
      },
    };

    const data: any[] = await this.getList(query);

    let startRow = 1;
    const gap = 1;

    for (let i = 0; i < data.length; i += 3) {
      const rowProducts = data.slice(i, i + 3);

      // Supplier
      rowProducts.forEach((item, index) => {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(startRow, colOffset + 1, startRow, colOffset + 4);

        const cell = worksheet.getCell(startRow, colOffset + 1);

        cell.value = `Supplier: ${item.Supplier}`;

        cell.border = {
          top: { style: 'medium' },
          left: { style: 'medium' },
          right: { style: 'medium' },
          bottom: { style: 'thin' },
        };
      });

      // Mat name
      rowProducts.forEach((item, index) => {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(
          startRow + 1,
          colOffset + 1,
          startRow + 1,
          colOffset + 4,
        );

        const cell = worksheet.getCell(startRow + 1, colOffset + 1);

        cell.value = `Mat name: ${item.Supplier_Material_Name}`;

        cell.border = {
          left: { style: 'medium' },
          right: { style: 'medium' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
        };
      });

      // Unit price + Season
      rowProducts.forEach((item, index) => {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(
          startRow + 2,
          colOffset + 1,
          startRow + 2,
          colOffset + 2,
        );

        worksheet.getCell(startRow + 2, colOffset + 1).value =
          `Unit price: $${item.SS26_Final_Price_USD}`;

        worksheet.getCell(startRow + 2, colOffset + 1).border = {
          left: { style: 'medium' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        worksheet.mergeCells(
          startRow + 2,
          colOffset + 3,
          startRow + 2,
          colOffset + 4,
        );

        worksheet.getCell(startRow + 2, colOffset + 3).value =
          `Season: ${item.Season}`;
        worksheet.getCell(startRow + 2, colOffset + 3).border = {
          right: { style: 'medium' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
        };
      });

      // MLM + Country
      rowProducts.forEach((item, index) => {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(
          startRow + 3,
          colOffset + 1,
          startRow + 3,
          colOffset + 2,
        );

        worksheet.getCell(startRow + 3, colOffset + 1).value =
          `MLM: ${item.Material_ID}`;
        worksheet.getCell(startRow + 3, colOffset + 1).border = {
          left: { style: 'medium' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        worksheet.mergeCells(
          startRow + 3,
          colOffset + 3,
          startRow + 3,
          colOffset + 4,
        );

        worksheet.getCell(startRow + 3, colOffset + 3).value =
          `Production Country: ${item.Production_Location}`;
        worksheet.getCell(startRow + 3, colOffset + 3).border = {
          right: { style: 'medium' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
        };
      });

      // Sample LT
      rowProducts.forEach((item, index) => {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(
          startRow + 4,
          colOffset + 1,
          startRow + 4,
          colOffset + 4,
        );

        worksheet.getCell(startRow + 4, colOffset + 1).value =
          `SampleLT: ${item.Sample_Leadtime} days`;
        worksheet.getCell(startRow + 4, colOffset + 1).border = {
          left: { style: 'medium' },
          right: { style: 'medium' },
          top: { style: 'thin' },
        };
      });

      // Production LT + QR
      for (const [index, item] of rowProducts.entries()) {
        const colOffset = index * (4 + gap);

        worksheet.mergeCells(
          startRow + 5,
          colOffset + 1,
          startRow + 5,
          colOffset + 4,
        );

        worksheet.getCell(startRow + 5, colOffset + 1).value =
          `Production LT: ${item.Leadtime} days`;
        worksheet.getCell(startRow + 5, colOffset + 1).border = {
          left: { style: 'medium' },
          right: { style: 'medium' },
          bottom: { style: 'medium' },
        };

        const qr = await QRCode.toDataURL(
          `${process.env.APP_URL}/materials/${item.ID}`,
        );

        const imageId = workbook.addImage({
          base64: qr,
          extension: 'png',
        });

        worksheet.addImage(imageId, {
          tl: { col: colOffset + 3.1, row: startRow + 3.2 },
          ext: { width: 57, height: 57 },
        });
      }

      // Style
      for (let r = 0; r < 6; r++) {
        rowProducts.forEach((_, index) => {
          const colOffset = index * (4 + gap);
          for (let c = 0; c < 4; c++) {
            const cell = worksheet.getCell(startRow + r, colOffset + c + 1);
            cell.font = {
              bold: true,
              name: 'Arial Narrow',
              family: 2,
              size: 9,
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true,
            };
          }
        });
        // worksheet.getRow(r).height = 20;
      }

      startRow += 7;
    }

    for (let r = 1; r <= startRow; r++) {
      worksheet.getRow(r).height = 25;
    }

    worksheet.properties.defaultColWidth = 10;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Materials-QR.xlsx',
    );

    await workbook.xlsx.write(res);

    res.end();
  }

  async showInfo(id: string) {
    const [rows] = await this.db.query(
      `
      SELECT
        m.*,
        (
          SELECT ImageID, ImagePath, ImageType
          FROM MaterialImages mi
          WHERE mi.MaterialID = m.ID
          AND mi.IsDeleted = 0
          FOR JSON PATH
        ) AS Images
      FROM Materials m

      WHERE m.ID = :id
      `,
      {
        replacements: {
          id,
        },
      },
    );

    const baseUrl = this.configService.get<string>('BASE_URL');

    const data = (rows as any[]).map((item) => {
      const images = item.Images ? JSON.parse(item.Images) : [];

      return {
        ...item,
        Images: images.map((img: any) => ({
          ...img,
          ImagePath: `${baseUrl}/uploads/materials/${img.ImagePath}`,
        })),
      };
    });

    return data;
  }

  async redirectToLink(id: string) {
    try {
      const [rows]: any = await this.db.query(
        `SELECT ID FROM Materials WHERE Unique_Price_ID = :id AND IsDeleted = 0`,
        { replacements: { id } },
      );

      if (!(rows as any[]).length) {
        throw new NotFoundException(`Không tìm thấy Material với ID "${id}"`);
      }

      const frontendUrl = this.configService.get<string>('BASE_URL');
      return `${frontendUrl}/materials/show-info/${rows[0].ID}`;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        error?.message || 'Redirect thất bại',
      );
    }
  }
}
