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
          whereConditions.push(`m.${column} LIKE :${key}`);
          replacements[key] = `%${query[key]}%`;
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

      const whereSql = whereConditions.join('\n AND ');

      const [rows] = await this.db.query(
        `
        SELECT
          m.*,
  
          COUNT(*) OVER() AS TotalCount,
  
          (
            SELECT ImageID, ImagePath
            FROM MaterialImages mi
            WHERE mi.MaterialID = m.ID
            AND mi.IsDeleted = 0
            FOR JSON PATH
          ) AS Images
  
        FROM Materials m
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

        return {
          ...item,
          Images: images.map((img: any) => ({
            ...img,
            ImagePath: `${baseUrl}/uploads/materials/${img.ImagePath}`,
          })),
        };
      });

      const total = data.length ? data[0].TotalCount : 0;

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
    files: Express.Multer.File[],
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

      if (files?.length) {
        const values = files
          .map(
            (f) => `(
              '${material.ID}',
              '${f.filename}',
              '${userId}'
            )`,
          )
          .join(',');

        await this.db.query(
          `
          INSERT INTO MaterialImages
            (MaterialID, ImagePath, CreatedBy)
          VALUES ${values}
          `,
          { transaction },
        );
      }

      const [images] = await this.db.query(
        `
        SELECT ImageID, ImagePath
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
    files: Express.Multer.File[],
    userId: string,
  ) {
    const transaction = await this.db.transaction();
    const uploadedFiles: string[] = [];

    try {
      const [updated] = await this.db.query(
        `
        UPDATE Materials
        SET
          Material_ID = ISNULL(:materialID, Material_ID),
          Vendor_Code = ISNULL(:vendorCode, Vendor_Code),
          Supplier = ISNULL(:supplier, Supplier),
          Supplier_Material_ID = ISNULL(:supplierMaterialID, Supplier_Material_ID),
          Supplier_Material_Name = ISNULL(:supplierMaterialName, Supplier_Material_Name),
          Mtl_Supp_Lifecycle_State = ISNULL(:mtlSuppLifecycleState, Mtl_Supp_Lifecycle_State),
          Material_Type_Level_1 = ISNULL(:materialTypeLevel1, Material_Type_Level_1),
          Composition = ISNULL(:composition, Composition),
          Classification = ISNULL(:classification, Classification),
          Material_Thickness = ISNULL(:materialThickness, Material_Thickness),
          Material_Thickness_UOM = ISNULL(:materialThicknessUOM, Material_Thickness_UOM),
          Comparison_UOM = ISNULL(:comparisonUOM, Comparison_UOM),
          Price_Remark = ISNULL(:priceRemark, Price_Remark),
          Skin_Size = ISNULL(:skinSize, Skin_Size),
          QC_Percent = ISNULL(:qCPercent, QC_Percent),
          Leadtime = ISNULL(:leadtime, Leadtime),
          Sample_Leadtime = ISNULL(:sampleLeadtime, Sample_Leadtime),
          Min_Qty_Color = ISNULL(:minQtyColor, Min_Qty_Color),
          Min_Qty_Sample = ISNULL(:minQtySample, Min_Qty_Sample),
          Production_Location = ISNULL(:productionLocation, Production_Location),
          Terms_of_Delivery_per_T1_Country = ISNULL(:termsofDeliveryperT1Country, Terms_of_Delivery_per_T1_Country),
          Valid_From_Price = ISNULL(:validFromPrice, Valid_From_Price),
          Valid_To_Price = ISNULL(:validToPrice, Valid_To_Price),
          Price_Type = ISNULL(:priceType, Price_Type),
          Color_Code_Price = ISNULL(:colorCodePrice, Color_Code_Price),
          Color_Price = ISNULL(:colorPrice, Color_Price),
          Treatment_Price = ISNULL(:treatmentPrice, Treatment_Price),
          Width_Price = ISNULL(:widthPrice, Width_Price),
          Width_Uom_Price = ISNULL(:widthUomPrice, Width_Uom_Price),
          Length_Price = ISNULL(:lengthPrice, Length_Price),
          Length_Uom_Price = ISNULL(:lengthUomPrice, Length_Uom_Price),
          Thickness_Price = ISNULL(:thicknessPrice, Thickness_Price),
          Thickness_Uom_Price = ISNULL(:thicknessUomPrice, Thickness_Uom_Price),
          Diameter_Inside_Price = ISNULL(:diameterInsidePrice, Diameter_Inside_Price),
          Diameter_Inside_Uom_Price = ISNULL(:diameterInsideUomPrice, Diameter_Inside_Uom_Price),
          Weight_Price = ISNULL(:weightPrice, Weight_Price),
          Weight_Uom_Price = ISNULL(:weightUomPrice, Weight_Uom_Price),
          Quantity_Price = ISNULL(:quantityPrice, Quantity_Price),
          Quantity_Uom_Price = ISNULL(:quantityUomPrice, Quantity_Uom_Price),
          Uom_String_Price = ISNULL(:uomStringPrice, Uom_String_Price),
          SS26_Final_Price_USD = ISNULL(:sS26FinalPriceUSD, SS26_Final_Price_USD),
          Comparison_Price_Price_USD = ISNULL(:comparisonPricePriceUSD, Comparison_Price_Price_USD),
          Approved_As_Final_Price_Y_N_Price = ISNULL(:approvedAsFinalPriceYNPrice, Approved_As_Final_Price_Y_N_Price),
          Season = ISNULL(:season, Season),
          UpdatedAt = SYSDATETIME(),
          UpdatedBy = :updatedBy
        OUTPUT INSERTED.*
        WHERE ID = :materialId AND IsDeleted = 0
        `,
        {
          transaction,
          replacements: {
            materialId,
            ...dto,
            updatedBy: userId,
          },
        },
      );

      if (!(updated as any[]).length) {
        throw new NotFoundException('Material not found');
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
            `SELECT ImagePath FROM MaterialImages WHERE ImageID = :imageId`,
            { transaction, replacements: { imageId } },
          );

          const images = old as { ImagePath: string }[];

          if (images.length) {
            const oldPath = `./uploads/materials/${images[0].ImagePath}`;
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }

          await this.db.query(
            `
            UPDATE MaterialImages
            SET ImagePath = :path,
                UpdatedAt = SYSDATETIME(),
                UpdatedBy = :updatedBy
            WHERE ImageID = :imageId
            `,
            {
              transaction,
              replacements: {
                imageId,
                path: file.filename,
                updatedBy: userId,
              },
            },
          );
        } else {
          await this.db.query(
            `
            INSERT INTO MaterialImages (
              ImageID, MaterialID, ImagePath, CreatedAt, CreatedBy
            )
            VALUES (
              NEWID(), :materialId, :path, SYSDATETIME(), :createdBy
            )
            `,
            {
              transaction,
              replacements: {
                materialId,
                path: file.filename,
                createdBy: userId,
              },
            },
          );
        }
      }

      const material = (updated as any[])[0];

      const baseUrl = this.configService.get<string>('BASE_URL');

      const [images] = await this.db.query(
        `
        SELECT ImageID, ImagePath
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

  // async exportExcel(res: any) {
  //   try {
  //     const [rows] = await this.db.query(`
  //       SELECT
  //         Material_ID,
  //         Vendor_Code,
  //         Supplier,
  //         Supplier_Material_ID,
  //         Supplier_Material_Name,
  //         Mtl_Supp_Lifecycle_State,
  //         Material_Type_Level_1,
  //         Composition,
  //         Classification,
  //         Material_Thickness,
  //         Material_Thickness_UOM,
  //         Comparison_UOM,
  //         Price_Remark,
  //         Skin_Size,
  //         QC_Percent,
  //         Leadtime,
  //         Sample_Leadtime,
  //         Min_Qty_Color,
  //         Min_Qty_Sample,
  //         Production_Location,
  //         Terms_of_Delivery_per_T1_Country,
  //         Valid_From_Price,
  //         Valid_To_Price,
  //         Price_Type,
  //         Color_Code_Price,
  //         Color_Price,
  //         Treatment_Price,
  //         Width_Price,
  //         Width_Uom_Price,
  //         Length_Price,
  //         Length_Uom_Price,
  //         Thickness_Price,
  //         Thickness_Uom_Price,
  //         Diameter_Inside_Price,
  //         Diameter_Inside_Uom_Price,
  //         Weight_Price,
  //         Weight_Uom_Price,
  //         Quantity_Price,
  //         Quantity_Uom_Price,
  //         Uom_String_Price,
  //         SS26_Final_Price_USD,
  //         Comparison_Price_Price_USD,
  //         Approved_As_Final_Price_Y_N_Price,
  //         Season
  //       FROM Materials
  //       WHERE IsDeleted = 0
  //       ORDER BY CreatedAt DESC
  //     `);

  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet('Materials');

  //     const columns = Object.keys((rows as any[])[0] || {});

  //     worksheet.columns = columns.map((col) => ({
  //       header: col,
  //       key: col,
  //       width: 25,
  //     }));

  //     (rows as any[]).forEach((row) => {
  //       worksheet.addRow(row);
  //     });

  //     res.setHeader(
  //       'Content-Type',
  //       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //     );

  //     res.setHeader(
  //       'Content-Disposition',
  //       'attachment; filename=Materials.xlsx',
  //     );

  //     await workbook.xlsx.write(res);
  //     res.end();
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       error?.message || 'Export excel failed',
  //     );
  //   }
  // }

  async exportExcel(res: any) {
    try {
      const [rows] = await this.db.query(`
        SELECT Material_ID,
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
          Season
        FROM Materials
        WHERE IsDeleted = 0
        ORDER BY CreatedAt DESC
      `);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Materials');

      const columns = Object.keys((rows as any[])[0] || {});

      worksheet.columns = columns.map((col) => ({
        header: col.replace(/_/g, ' '),
        key: col,
        width: 25,
      }));

      (rows as any[]).forEach((row) => {
        worksheet.addRow(row);
      });

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      worksheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: worksheet.columnCount,
        },
      };

      const totalRows = worksheet.rowCount;
      const totalCols = worksheet.columnCount;

      for (let r = 1; r <= totalRows; r++) {
        const row = worksheet.getRow(r);

        for (let c = 1; c <= totalCols; c++) {
          const cell = row.getCell(c);

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'thin' },
          };

          if (r === 1) {
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
          } else {
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
            };
          }
        }

        if (r > 1 && r % 2 === 0) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
          });
        }
      }

      worksheet.columns.forEach((column) => {
        let maxLength = 10;

        if (typeof column.eachCell === 'function') {
          column.eachCell({ includeEmpty: true }, (cell) => {
            const val = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, val.length);
          });
        }

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
}
