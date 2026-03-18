import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Sequelize } from 'sequelize-typescript';
import { randomUUID } from 'crypto';

@Injectable()
export class AppService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}
  // async getBase64ToImage() {
  //   try {
  //     await this.db.query(`
  //       INSERT INTO Colors
  //       (
  //         ColorName,
  //         ColorCode,
  //         RGBValue,
  //         CMYKValue,
  //         ColorGroup,
  //         ColorStatus
  //       )
  //       SELECT
  //         Color_Name,
  //         Color_Code,
  //         RGB_Value,
  //         CMYK_Value,
  //         Color_Group,
  //         CASE
  //           WHEN Color_Status = 'Active' THEN 1
  //           WHEN Color_Status = 'Inactive' THEN 0
  //           ELSE 0
  //         END
  //       FROM LYG_DL.LYG_DL.dbo.DL_Colors;
  //     `);

  //     await this.db.query(`
  //       INSERT INTO ColorImages
  //       (
  //         ColorID,
  //         ImagePath
  //       )
  //       SELECT
  //         c.ColorID,
  //         ''
  //       FROM LYG_DL.LYG_DL.dbo.DL_ColorsImage i
  //       JOIN LYG_DL.LYG_DL.dbo.DL_Colors dc
  //         ON i.ID_Img = dc.ID_Img
  //       JOIN Colors c
  //         ON c.ColorCode = dc.Color_Code;
  //     `);
  //     return 'Migration successful';
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  // async getBase64ToImage() {
  //   try {
  //     const uploadDir = path.join(process.cwd(), 'uploads/colors');
  //     await fs.promises.mkdir(uploadDir, { recursive: true });

  //     await this.db.query(`
  //       INSERT INTO Colors
  //       (
  //         ColorName,
  //         ColorCode,
  //         RGBValue,
  //         CMYKValue,
  //         ColorGroup,
  //         ColorStatus
  //       )
  //       SELECT
  //         Color_Name,
  //         Color_Code,
  //         RGB_Value,
  //         CMYK_Value,
  //         Color_Group,
  //         CASE
  //           WHEN Color_Status = 'Active' THEN 1
  //           WHEN Color_Status = 'Inactive' THEN 0
  //           ELSE 0
  //         END
  //       FROM LYG_DL.LYG_DL.dbo.DL_Colors
  //     `);

  //     const [rows]: any = await this.db.query(`
  //       SELECT
  //         c.ColorID,
  //         i.ColorsImg
  //       FROM LYG_DL.LYG_DL.dbo.DL_ColorsImage i
  //       JOIN LYG_DL.LYG_DL.dbo.DL_Colors dc
  //         ON i.ID_Img = dc.ID_Img
  //       JOIN Colors c
  //         ON c.ColorCode = dc.Color_Code
  //     `);

  //     for (const row of rows) {
  //       if (!row.ColorsImg) continue;

  //       let base64 = row.ColorsImg.replace(/\s/g, '');

  //       const buffer = Buffer.from(base64, 'base64');

  //       const fileName = `color_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
  //       const filePath = path.join(uploadDir, fileName);

  //       await fs.promises.writeFile(filePath, buffer);

  //       // 4️⃣ insert ColorImages
  //       await this.db.query(
  //         `
  //         INSERT INTO ColorImages
  //         (
  //           ColorID,
  //           ImagePath
  //         )
  //         VALUES
  //         (
  //           :colorId,
  //           :path
  //         )
  //       `,
  //         {
  //           replacements: {
  //             colorId: row.ColorID,
  //             path: fileName,
  //           },
  //         },
  //       );
  //     }

  //     return 'Migration successful';
  //   } catch (error) {
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  async getBase64ToImageColor() {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads/colors');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      await this.db.query(`
        INSERT INTO Colors (ColorName, ColorCode, RGBValue, CMYKValue, ColorGroup, ColorStatus)
        SELECT 
          Color_Name,
          Color_Code,
          RGB_Value,
          CMYK_Value,
          Color_Group,
          CASE 
            WHEN Color_Status = 'Active' THEN 1
            WHEN Color_Status = 'Inactive' THEN 0
            ELSE 0 
          END
        FROM LYG_DL.LYG_DL.dbo.DL_Colors
      `);

      const [rows]: any = await this.db.query(`
        SELECT 
          c.ColorID,
          i.ColorsImg
        FROM LYG_DL.LYG_DL.dbo.DL_ColorsImage i
        LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Colors dc ON i.ID_Img = dc.ID_Img
        LEFT JOIN Colors c ON c.ColorCode = dc.Color_Code
      `);

      // console.log(rows.length);

      for (const row of rows) {
        if (!row.ColorsImg) continue;

        let base64 = row.ColorsImg.trim().replace(/\s/g, '');

        if (base64.startsWith('data:')) {
          const matches = base64.match(
            /^data:([A-Za-z-]+\/[A-Za-z-]+);base64,(.+)$/,
          );
          if (matches) base64 = matches[2];
        }

        let extension = 'png';
        if (base64.startsWith('/9j/')) extension = 'jpg';
        else if (base64.startsWith('iVBORw0KGgo')) extension = 'png';

        const fileName = `${randomUUID()}.${extension}`;
        const filePath = path.join(uploadDir, fileName);

        try {
          const buffer = Buffer.from(base64, 'base64');

          await fs.promises.writeFile(filePath, buffer);

          await this.db.query(
            `
            INSERT INTO ColorImages (ColorID, ImagePath)
            VALUES (:colorId, :path)
            `,
            {
              replacements: {
                colorId: row.ColorID,
                path: `${fileName}`,
              },
            },
          );

          console.log(`✅ Saved: ${fileName}`);
        } catch (err) {
          console.error(`❌ Lỗi ảnh ColorID ${row.ColorID}:`, err.message);
        }
      }

      return 'Migration successful! 🎉';
    } catch (error) {
      console.error('Migration lỗi:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  // async getBase64ToImageMaterial() {
  //   try {
  //     const uploadDir = path.join(process.cwd(), 'uploads/materials');
  //     await fs.promises.mkdir(uploadDir, { recursive: true });

  //     await this.db.query(`
  //       INSERT INTO Materials
  //       (
  //         Unique_Price_ID,Material_ID,Vendor_Code,Supplier,Supplier_Material_ID,Supplier_Material_Name,Mtl_Supp_Lifecycle_State,
  //         Material_Type_Level_1,Composition,Classification,Material_Thickness,Material_Thickness_UOM,Comparison_UOM,Price_Remark,Skin_Size,
  //         QC_Percent,Leadtime,Sample_Leadtime,Min_Qty_Color,Min_Qty_Sample,Production_Location,Terms_of_Delivery_per_T1_Country,Valid_From_Price,
  //         Valid_To_Price,Price_Type,Color_Code_Price,Color_Price,Treatment_Price,Width_Price,Width_Uom_Price,Length_Price,Length_Uom_Price,
  //         Thickness_Price,Thickness_Uom_Price,Diameter_Inside_Price,Diameter_Inside_Uom_Price,Weight_Price,Weight_Uom_Price,Quantity_Price,
  //         Quantity_Uom_Price,Uom_String_Price,SS26_Final_Price_USD,Comparison_Price_Price_USD,Approved_As_Final_Price_Y_N_Price,Season
  //       )
  //       SELECT Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
  //             Supplier_Material_Name, Mtl_Supp_Lifecycle_State, Material_Type_Level_1,
  //             Composition, Classification, Material_Thickness, Material_Thickness_UOM,
  //             Comparison_UOM, Price_Remark, Skin_Size, QC_Percent, Leadtime,
  //             Sample_Leadtime, Min_Qty_Color, Min_Qty_Sample, Production_Location,
  //             Terms_of_Delivery_per_T1_Country, Valid_From_Price, Valid_To_Price,
  //             Price_Type, Color_Code_Price, Color_Price, Treatment_Price, Width_Price,
  //             Width_Uom_Price, Length_Price, Length_Uom_Price, Thickness_Price,
  //             Thickness_Uom_Price, Diameter_Inside_Price, Diameter_Inside_Uom_Price,
  //             Weight_Price, Weight_Uom_Price, Quantity_Price, Quantity_Uom_Price,
  //             Uom_String_Price, SS26_Final_Price_USD, Comparison_Price_Price_USD,
  //             Approved_As_Final_Price_Y_N_Price, Season
  //       FROM LYG_DL.LYG_DL.dbo.DL_Materials dm
  //       WHERE NOT EXISTS (
  //         SELECT 1 FROM Materials m
  //         WHERE m.Unique_Price_ID = dm.Unique_Price_ID
  //       )
  //     `);

  //     const saveImage = async (
  //       base64: string,
  //       materialId: number,
  //       type: string,
  //     ) => {
  //       if (!base64 || base64.length < 50) return;

  //       base64 = base64.trim().replace(/\s/g, '');

  //       if (base64.startsWith('data:')) {
  //         const matches = base64.match(
  //           /^data:([A-Za-z-]+\/[A-Za-z-]+);base64,(.+)$/,
  //         );
  //         if (matches) base64 = matches[2];
  //       }

  //       let extension = 'png';
  //       if (base64.startsWith('/9j/')) extension = 'jpg';
  //       else if (base64.startsWith('iVBORw0KGgo')) extension = 'png';

  //       const fileName = `${randomUUID()}.${extension}`;
  //       const filePath = path.join(uploadDir, fileName);

  //       const buffer = Buffer.from(base64, 'base64');
  //       await fs.promises.writeFile(filePath, buffer);

  //       await this.db.query(
  //         `
  //         INSERT INTO MaterialImages (MaterialID, ImagePath, ImageType)
  //         VALUES (:materialId, :path, :type)
  //         `,
  //         {
  //           replacements: {
  //             materialId,
  //             path: fileName,
  //             type,
  //           },
  //         },
  //       );

  //       console.log(`✅ Saved ${type}: ${fileName}`);
  //     };

  //     const batchSize = 200;
  //     let offset = 0;

  //     while (true) {
  //       const [rows]: any = await this.db.query(
  //         `
  //         SELECT m.ID, dmi.TopsideImage, dmi.BotsideImage
  //         FROM LYG_DL.LYG_DL.dbo.DL_MaterialsImage AS dmi
  //         LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Materials AS dm ON dm.ID_Image = dmi.ID_Image
  //         LEFT JOIN Materials AS m ON m.Unique_Price_ID = dm.Unique_Price_ID
  //         ORDER BY dmi.ID_Image
  //         OFFSET :offset ROWS
  //         FETCH NEXT :batchSize ROWS ONLY
  //       `,
  //         { replacements: { offset, batchSize } },
  //       );

  //       if (!rows.length) break;

  //       for (const row of rows) {
  //         try {
  //           await Promise.all([
  //             saveImage(row.TopsideImage, row.ID, 'TopSide'),
  //             saveImage(row.BotsideImage, row.ID, 'BottomSide'),
  //           ]);
  //         } catch (error) {
  //           console.error(`❌ Lỗi ảnh ColorID ${row.ColorID}:`, error.message);
  //         }
  //       }
  //       offset += batchSize;
  //       console.log(`✅ Processed ${offset} records`);
  //     }

  //     return 'Migration successful! 🎉';
  //   } catch (error) {
  //     console.error('Migration lỗi:', error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  // async getBase64ToImageMaterial() {
  //   try {
  //     const uploadDir = path.join(process.cwd(), 'uploads/materials');
  //     await fs.promises.mkdir(uploadDir, { recursive: true });

  //     await this.db.query(`
  // INSERT INTO Materials (
  //   Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
  //   Supplier_Material_Name, Mtl_Supp_Lifecycle_State, Material_Type_Level_1,
  //   Composition, Classification, Material_Thickness, Material_Thickness_UOM,
  //   Comparison_UOM, Price_Remark, Skin_Size, QC_Percent, Leadtime,
  //   Sample_Leadtime, Min_Qty_Color, Min_Qty_Sample, Production_Location,
  //   Terms_of_Delivery_per_T1_Country, Valid_From_Price, Valid_To_Price,
  //   Price_Type, Color_Code_Price, Color_Price, Treatment_Price, Width_Price,
  //   Width_Uom_Price, Length_Price, Length_Uom_Price, Thickness_Price,
  //   Thickness_Uom_Price, Diameter_Inside_Price, Diameter_Inside_Uom_Price,
  //   Weight_Price, Weight_Uom_Price, Quantity_Price, Quantity_Uom_Price,
  //   Uom_String_Price, SS26_Final_Price_USD, Comparison_Price_Price_USD,
  //   Approved_As_Final_Price_Y_N_Price, Season
  // )
  // SELECT
  //   Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
  //   Supplier_Material_Name, Mtl_Supp_Lifecycle_State, Material_Type_Level_1,
  //   Composition, Classification, Material_Thickness, Material_Thickness_UOM,
  //   Comparison_UOM, Price_Remark, Skin_Size, QC_Percent, Leadtime,
  //   Sample_Leadtime, Min_Qty_Color, Min_Qty_Sample, Production_Location,
  //   Terms_of_Delivery_per_T1_Country, Valid_From_Price, Valid_To_Price,
  //   Price_Type, Color_Code_Price, Color_Price, Treatment_Price, Width_Price,
  //   Width_Uom_Price, Length_Price, Length_Uom_Price, Thickness_Price,
  //   Thickness_Uom_Price, Diameter_Inside_Price, Diameter_Inside_Uom_Price,
  //   Weight_Price, Weight_Uom_Price, Quantity_Price, Quantity_Uom_Price,
  //   Uom_String_Price, SS26_Final_Price_USD, Comparison_Price_Price_USD,
  //   Approved_As_Final_Price_Y_N_Price, Season
  // FROM LYG_DL.LYG_DL.dbo.DL_Materials dm
  // WHERE NOT EXISTS (
  //   SELECT 1 FROM Materials m
  //   WHERE m.Unique_Price_ID = dm.Unique_Price_ID
  // )
  //     `);

  //     const BATCH_SIZE = 1000;
  //     const CONCURRENCY = 20;
  //     const INSERT_CHUNK = 200;

  //     let offset = 0;
  //     let totalSaved = 0;
  //     let totalError = 0;

  //     const saveImage = async (
  //       base64: string,
  //       materialId: number,
  //       type: string,
  //     ): Promise<{ materialId: number; path: string; type: string } | null> => {
  //       if (!base64 || base64.length < 50) return null;

  //       base64 = base64.trim().replace(/\s/g, '');

  //       if (base64.startsWith('data:')) {
  //         const matches = base64.match(
  //           /^data:([A-Za-z-]+\/[A-Za-z-]+);base64,(.+)$/,
  //         );
  //         if (matches) base64 = matches[2];
  //       }

  //       let extension = 'png';
  //       if (base64.startsWith('/9j/')) extension = 'jpg';
  //       else if (base64.startsWith('iVBORw0KGgo')) extension = 'png';

  //       const fileName = `${randomUUID()}.${extension}`;
  //       const filePath = path.join(uploadDir, fileName);

  //       await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));

  //       return { materialId, path: fileName, type };
  //     };

  //     const bulkInsertImages = async (
  //       images: { materialId: number; path: string; type: string }[],
  //     ) => {
  //       for (let i = 0; i < images.length; i += INSERT_CHUNK) {
  //         const chunk = images.slice(i, i + INSERT_CHUNK);

  //         const placeholders = chunk
  //           .map((_, idx) => `(:materialId${idx}, :path${idx}, :type${idx})`)
  //           .join(', ');

  //         const replacements = chunk.reduce(
  //           (acc, img, idx) => {
  //             acc[`materialId${idx}`] = img.materialId;
  //             acc[`path${idx}`] = img.path;
  //             acc[`type${idx}`] = img.type;
  //             return acc;
  //           },
  //           {} as Record<string, any>,
  //         );

  //         await this.db.query(
  //           `INSERT INTO MaterialImages (MaterialID, ImagePath, ImageType) VALUES ${placeholders}`,
  //           { replacements },
  //         );
  //       }
  //     };

  //     while (true) {
  //       const [rows]: any = await this.db.query(
  //         `
  //         SELECT m.ID, dmi.TopsideImage, dmi.BotsideImage
  //         FROM LYG_DL.LYG_DL.dbo.DL_MaterialsImage AS dmi
  //         LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Materials  AS dm ON dm.ID_Image = dmi.ID_Image
  //         LEFT JOIN Materials                         AS m  ON m.Unique_Price_ID = dm.Unique_Price_ID
  //         WHERE m.ID IS NOT NULL
  //         AND NOT EXISTS (
  //           SELECT 1 FROM MaterialImages mi
  //           WHERE mi.MaterialID = m.ID
  //         )
  //         ORDER BY dmi.ID_Image
  //         OFFSET :offset ROWS
  //         FETCH NEXT :batchSize ROWS ONLY
  //         `,
  //         { replacements: { offset, batchSize: BATCH_SIZE } },
  //       );

  //       if (!rows.length) break;

  //       const imageResults: {
  //         materialId: number;
  //         path: string;
  //         type: string;
  //       }[] = [];

  //       for (let i = 0; i < rows.length; i += CONCURRENCY) {
  //         const chunk = rows.slice(i, i + CONCURRENCY);

  //         const settled = await Promise.allSettled(
  //           chunk.flatMap((row) => [
  //             saveImage(row.TopsideImage, row.ID, 'TopSide'),
  //             saveImage(row.BotsideImage, row.ID, 'BottomSide'),
  //           ]),
  //         );

  //         settled.forEach((result) => {
  //           if (result.status === 'fulfilled' && result.value) {
  //             imageResults.push(result.value);
  //           } else if (result.status === 'rejected') {
  //             totalError++;
  //             console.error(`❌ Lỗi save ảnh:`, result.reason?.message);
  //           }
  //         });
  //       }

  //       if (imageResults.length > 0) {
  //         await bulkInsertImages(imageResults);
  //         totalSaved += imageResults.length;
  //       }

  //       offset += BATCH_SIZE;
  //       console.log(
  //         `✅ Processed ${offset} records | Saved: ${totalSaved} | Errors: ${totalError}`,
  //       );
  //     }

  //     console.log(
  //       `🎉 Migration hoàn tất! Tổng ảnh lưu: ${totalSaved} | Lỗi: ${totalError}`,
  //     );
  //     return {
  //       message: 'Migration successful! 🎉',
  //       totalSaved,
  //       totalError,
  //     };
  //   } catch (error) {
  //     console.error('❌ Migration lỗi:', error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  async getBase64ToImageMaterial() {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads/materials');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      await this.syncMaterials();

      const BATCH_SIZE = 500;
      const CONCURRENCY = 30;
      const INSERT_CHUNK = 500;

      let totalSaved = 0;
      let totalError = 0;

      // ✅ Bước 1: Query nhẹ - chỉ lấy ID, chạy 1 lần duy nhất
      // NOT EXISTS + JOIN chỉ tốn chi phí đúng 1 lần thay vì mỗi batch
      console.log('🔍 Đang lấy danh sách ID cần xử lý...');
      const [pendingRows]: any = await this.db.query(`
        SELECT m.ID
        FROM LYG_DL.LYG_DL.dbo.DL_MaterialsImage AS dmi
        LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Materials AS dm
          ON dm.ID_Image = dmi.ID_Image
        LEFT JOIN Materials AS m
          ON m.Unique_Price_ID = dm.Unique_Price_ID
        WHERE m.ID IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM MaterialImages mi
            WHERE mi.MaterialID = m.ID
          )
        ORDER BY m.ID
      `);

      if (!pendingRows.length) {
        console.log('✅ Không có dữ liệu mới cần migrate!');
        return { message: 'Nothing to migrate!', totalSaved: 0, totalError: 0 };
      }

      console.log(`📋 Tổng số material cần xử lý: ${pendingRows.length}`);

      // Tách thành các batch ID
      const allIds: number[] = pendingRows.map((r: any) => r.ID);
      const idBatches = this.chunkArray(allIds, BATCH_SIZE);

      // ✅ Bước 2: Mỗi batch chỉ cần WHERE IN (...) - cực nhanh
      for (let batchIdx = 0; batchIdx < idBatches.length; batchIdx++) {
        const batchIds = idBatches[batchIdx];

        const [rows]: any = await this.db.query(
          `
          SELECT m.ID, dmi.TopsideImage, dmi.BotsideImage
          FROM LYG_DL.LYG_DL.dbo.DL_MaterialsImage AS dmi
          LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Materials AS dm
            ON dm.ID_Image = dmi.ID_Image
          LEFT JOIN Materials AS m
            ON m.Unique_Price_ID = dm.Unique_Price_ID
          WHERE m.ID IN (:batchIds)
          `,
          { replacements: { batchIds } },
        );

        const imageResults: {
          materialId: number;
          path: string;
          type: string;
        }[] = [];

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
          const chunk = rows.slice(i, i + CONCURRENCY);

          const settled = await Promise.allSettled(
            chunk.flatMap((row) => [
              this.saveImage(row.TopsideImage, row.ID, 'TopSide', uploadDir),
              this.saveImage(row.BotsideImage, row.ID, 'BottomSide', uploadDir),
            ]),
          );

          settled.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              imageResults.push(result.value);
            } else if (result.status === 'rejected') {
              totalError++;
              console.error(`❌ Lỗi save ảnh:`, result.reason?.message);
            }
          });
        }

        if (imageResults.length > 0) {
          await this.bulkInsertImages(imageResults, INSERT_CHUNK);
          totalSaved += imageResults.length;
        }

        console.log(
          `✅ Batch ${batchIdx + 1}/${idBatches.length} | Saved: ${totalSaved} | Errors: ${totalError}`,
        );
      }

      console.log(
        `🎉 Migration hoàn tất! Tổng ảnh lưu: ${totalSaved} | Lỗi: ${totalError}`,
      );

      return { message: 'Migration successful! 🎉', totalSaved, totalError };
    } catch (error) {
      console.error('❌ Migration lỗi:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  // ─────────────────────────────────────────────
  // SYNC MATERIALS (chạy 1 lần đầu)
  // ─────────────────────────────────────────────
  private async syncMaterials() {
    await this.db.query(`
      INSERT INTO Materials (
        Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
        Supplier_Material_Name, Mtl_Supp_Lifecycle_State, Material_Type_Level_1,
        Composition, Classification, Material_Thickness, Material_Thickness_UOM,
        Comparison_UOM, Price_Remark, Skin_Size, QC_Percent, Leadtime,
        Sample_Leadtime, Min_Qty_Color, Min_Qty_Sample, Production_Location,
        Terms_of_Delivery_per_T1_Country, Valid_From_Price, Valid_To_Price,
        Price_Type, Color_Code_Price, Color_Price, Treatment_Price, Width_Price,
        Width_Uom_Price, Length_Price, Length_Uom_Price, Thickness_Price,
        Thickness_Uom_Price, Diameter_Inside_Price, Diameter_Inside_Uom_Price,
        Weight_Price, Weight_Uom_Price, Quantity_Price, Quantity_Uom_Price,
        Uom_String_Price, SS26_Final_Price_USD, Comparison_Price_Price_USD,
        Approved_As_Final_Price_Y_N_Price, Season
      )
      SELECT
        Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
        Supplier_Material_Name, Mtl_Supp_Lifecycle_State, Material_Type_Level_1,
        Composition, Classification, Material_Thickness, Material_Thickness_UOM,
        Comparison_UOM, Price_Remark, Skin_Size, QC_Percent, Leadtime,
        Sample_Leadtime, Min_Qty_Color, Min_Qty_Sample, Production_Location,
        Terms_of_Delivery_per_T1_Country, Valid_From_Price, Valid_To_Price,
        Price_Type, Color_Code_Price, Color_Price, Treatment_Price, Width_Price,
        Width_Uom_Price, Length_Price, Length_Uom_Price, Thickness_Price,
        Thickness_Uom_Price, Diameter_Inside_Price, Diameter_Inside_Uom_Price,
        Weight_Price, Weight_Uom_Price, Quantity_Price, Quantity_Uom_Price,
        Uom_String_Price, SS26_Final_Price_USD, Comparison_Price_Price_USD,
        Approved_As_Final_Price_Y_N_Price, Season
      FROM LYG_DL.LYG_DL.dbo.DL_Materials dm
      WHERE NOT EXISTS (
        SELECT 1 FROM Materials m
        WHERE m.Unique_Price_ID = dm.Unique_Price_ID
      )
    `);
  }

  // ─────────────────────────────────────────────
  // SAVE 1 ẢNH RA DISK (có retry)
  // ─────────────────────────────────────────────
  private async saveImage(
    base64: string,
    materialId: number,
    type: string,
    uploadDir: string,
  ): Promise<{ materialId: number; path: string; type: string } | null> {
    if (!base64 || base64.length < 50) return null;

    const cleaned = base64.trim().replace(/\s+/g, '');
    const raw = cleaned.startsWith('data:')
      ? (cleaned.match(/^data:[^;]+;base64,(.+)$/)?.[1] ?? cleaned)
      : cleaned;

    const headerBuf = Buffer.from(raw.slice(0, 16), 'base64');
    const extension =
      headerBuf[0] === 0xff && headerBuf[1] === 0xd8
        ? 'jpg'
        : headerBuf[0] === 0x89 && headerBuf[1] === 0x50
          ? 'png'
          : 'png';

    const fileName = `${randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await this.retry(() =>
      fs.promises.writeFile(filePath, Buffer.from(raw, 'base64')),
    );

    return { materialId, path: fileName, type };
  }

  // ─────────────────────────────────────────────
  // BULK INSERT ẢNH vào DB
  // ─────────────────────────────────────────────
  private async bulkInsertImages(
    images: { materialId: number; path: string; type: string }[],
    chunkSize: number,
  ) {
    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);

      const placeholders = chunk.map(() => `(?, ?, ?)`).join(', ');
      const values = chunk.flatMap((img) => [
        img.materialId,
        img.path,
        img.type,
      ]);

      await this.db.query(
        `INSERT INTO MaterialImages (MaterialID, ImagePath, ImageType) VALUES ${placeholders}`,
        { replacements: values },
      );
    }
  }

  // ─────────────────────────────────────────────
  // CHUNK ARRAY HELPER
  // ─────────────────────────────────────────────
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }

  // ─────────────────────────────────────────────
  // RETRY HELPER với exponential backoff
  // ─────────────────────────────────────────────
  private async retry<T>(
    fn: () => Promise<T>,
    attempts = 3,
    delayMs = 200,
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
    throw new Error('Unreachable');
  }
}
