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

  async getBase64ToImageMaterial() {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads/materials');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      await this.db.query(`
        INSERT INTO Materials
        (
          Unique_Price_ID,Material_ID,Vendor_Code,Supplier,Supplier_Material_ID,Supplier_Material_Name,Mtl_Supp_Lifecycle_State,
          Material_Type_Level_1,Composition,Classification,Material_Thickness,Material_Thickness_UOM,Comparison_UOM,Price_Remark,Skin_Size,
          QC_Percent,Leadtime,Sample_Leadtime,Min_Qty_Color,Min_Qty_Sample,Production_Location,Terms_of_Delivery_per_T1_Country,Valid_From_Price,
          Valid_To_Price,Price_Type,Color_Code_Price,Color_Price,Treatment_Price,Width_Price,Width_Uom_Price,Length_Price,Length_Uom_Price,
          Thickness_Price,Thickness_Uom_Price,Diameter_Inside_Price,Diameter_Inside_Uom_Price,Weight_Price,Weight_Uom_Price,Quantity_Price,
          Quantity_Uom_Price,Uom_String_Price,SS26_Final_Price_USD,Comparison_Price_Price_USD,Approved_As_Final_Price_Y_N_Price,Season
        )
        SELECT Unique_Price_ID, Material_ID, Vendor_Code, Supplier, Supplier_Material_ID,
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
        FROM LYG_DL.LYG_DL.dbo.DL_Materials
      `);

      const [rows]: any = await this.db.query(`
        SELECT TOP 100 m.ID, dmi.TopsideImage
        FROM LYG_DL.LYG_DL.dbo.DL_MaterialsImage AS dmi
        LEFT JOIN LYG_DL.LYG_DL.dbo.DL_Materials AS dm ON dm.ID_Image = dmi.ID_Image
        LEFT JOIN Materials AS m ON m.Unique_Price_ID = dm.Unique_Price_ID
      `);

      // console.log(rows.length);

      for (const row of rows) {
        if (!row.TopsideImage) continue;

        let base64 = row.TopsideImage.trim().replace(/\s/g, '');

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
            INSERT INTO MaterialImages (MaterialID, ImagePath, ImageType)
            VALUES (:materialId, :path, :type)
            `,
            {
              replacements: {
                materialId: row.ID,
                path: `${fileName}`,
                type: 'Topside',
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
}
