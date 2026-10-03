import express from "express";
import path from "path";
import fs from "fs/promises";
import { readFileSync } from "fs";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, writeBatch } from "firebase/firestore";
import { initialCertificatesMap, initialCertificatesList } from "./src/data/allCertificates";

dotenv.config();

const DATA_FILE = path.join(process.cwd(), "data.json");

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(initialCertificatesMap, null, 2));
  }
}

async function readDataFile() {
  await ensureDataFile();
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    if (!data.trim()) return { ...initialCertificatesMap };
    const parsed = JSON.parse(data);
    return { ...initialCertificatesMap, ...parsed };
  } catch (err) {
    console.error("Error reading or parsing data file:", err);
    return { ...initialCertificatesMap };
  }
}

async function writeDataFile(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

let firebaseApp: any = null;
let firestoreDb: any = null;
let firebaseInitialized = false;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const configRaw = readFileSync(configPath, "utf-8");
  const firebaseConfig = JSON.parse(configRaw);
  
  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  firebaseInitialized = true;
  console.log("Firebase Firestore initialized successfully as persistent cloud database.");
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

let mysqlPool: any = null;
let mysqlError: string | null = null;
let lastDbCheckTime = 0;
const DB_RETRY_INTERVAL = 30000; // Retry connection after 30 seconds if it failed

// Normalizer to map MySQL rows to valid TypeScript booleans
function mapRowToCertificate(row: any): any {
  if (!row) return null;
  return {
    ...row,
    testedPurity: parseFloat(row.testedPurity) || 0,
    weight: parseFloat(row.weight) || 0,
    sendSms: row.sendSms === 1 || row.sendSms === true || row.sendSms === "1",
    showGoldWeight_reg: row.showGoldWeight_reg === 1 || row.showGoldWeight_reg === true || row.showGoldWeight_reg === "1",
    showCustomerName: row.showCustomerName === 1 || row.showCustomerName === true || row.showCustomerName === "1",
    showWeight: row.showWeight === 1 || row.showWeight === true || row.showWeight === "1",
    showSampleWeight: row.showSampleWeight === 1 || row.showSampleWeight === true || row.showSampleWeight === "1",
    showActive: row.showActive === 1 || row.showActive === true || row.showActive === "1",
    showGoldWeight: row.showGoldWeight === 1 || row.showGoldWeight === true || row.showGoldWeight === "1",
    showPrepTime: row.showPrepTime === 1 || row.showPrepTime === true || row.showPrepTime === "1",
    showTitle: row.showTitle === 1 || row.showTitle === true || row.showTitle === "1",
  };
}

async function initMysqlTable(pool: any) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(50) PRIMARY KEY,
      certificateNo VARCHAR(100) NOT NULL,
      ownerName VARCHAR(255),
      assayDate VARCHAR(50),
      metalType VARCHAR(20) DEFAULT 'gold',
      declaredPurity VARCHAR(100),
      testedPurity DOUBLE,
      weight DOUBLE,
      inspector VARCHAR(255),
      status VARCHAR(20) DEFAULT 'approved',
      itemType VARCHAR(255),
      labBranch VARCHAR(255),
      qrValue VARCHAR(255),
      remarks TEXT,
      sendSms BOOLEAN DEFAULT TRUE,
      showGoldWeight_reg BOOLEAN DEFAULT TRUE,
      showCustomerName BOOLEAN DEFAULT TRUE,
      showWeight BOOLEAN DEFAULT TRUE,
      sampleRegistered VARCHAR(255),
      showSampleWeight BOOLEAN DEFAULT TRUE,
      showActive BOOLEAN DEFAULT TRUE,
      showGoldWeight BOOLEAN DEFAULT TRUE,
      showPrepTime BOOLEAN DEFAULT TRUE,
      prepTime VARCHAR(100),
      showTitle BOOLEAN DEFAULT TRUE,
      titleSelect VARCHAR(255),
      wageType VARCHAR(20),
      wageAmount VARCHAR(100),
      documentType VARCHAR(20),
      packetNumber VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.query(createTableQuery);
  console.log("MySQL 'certificates' table verified/created successfully.");

  // Also create gallery table
  const createGalleryTableQuery = `
    CREATE TABLE IF NOT EXISTS gallery (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255),
      imageUrl LONGTEXT NOT NULL,
      description TEXT,
      category VARCHAR(50),
      createdAt VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.query(createGalleryTableQuery);
  console.log("MySQL 'gallery' table verified/created successfully.");

  // Safely add column 'category' if the table already existed without it
  try {
    await pool.query("ALTER TABLE gallery ADD COLUMN category VARCHAR(50)");
    console.log("MySQL table 'gallery' updated with 'category' column successfully.");
  } catch (err) {
    // Column already exists or table alter failed, which is safe to ignore
  }

  // Safely add column 'sort_order' if the table already existed without it
  try {
    await pool.query("ALTER TABLE gallery ADD COLUMN sort_order INT DEFAULT 999999");
    console.log("MySQL table 'gallery' updated with 'sort_order' column successfully.");
  } catch (err) {
    // Column already exists or table alter failed, which is safe to ignore
  }
}

async function getMysqlPool() {
  if (!process.env.MYSQL_HOST) {
    return null;
  }
  if (mysqlPool) return mysqlPool;

  const now = Date.now();
  if (mysqlError && (now - lastDbCheckTime < DB_RETRY_INTERVAL)) {
    // If it recently failed, don't block the request. Instantly use local fallback.
    return null;
  }

  lastDbCheckTime = now;

  try {
    const config = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || "3306", 10),
      connectionLimit: 10,
      connectTimeout: 2000, // Faster timeout so requests never hang too long
    };
    
    mysqlPool = mysql.createPool(config);
    
    // Test connection
    const connection = await mysqlPool.getConnection();
    console.log("Successfully connected to cPanel MySQL database!");
    connection.release();
    
    // Check and create table
    await initMysqlTable(mysqlPool);
    
    mysqlError = null;
    return mysqlPool;
  } catch (error: any) {
    console.error("Failed to connect to MySQL database:", error);
    mysqlError = error.message || String(error);
    mysqlPool = null;
    return null;
  }
}

async function startServer() {
  await ensureDataFile();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // SEO: Serve robots.txt and sitemap.xml directly from memory to bypass cPanel/Apache file permission 403 errors
  app.get("/robots.txt", (req, res) => {
    res.header("Content-Type", "text/plain; charset=utf-8");
    res.send(`User-agent: *
Allow: /

Sitemap: https://askarnejad.ir/sitemap.xml`);
  });

  app.get("/sitemap.xml", (req, res) => {
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://askarnejad.ir/</loc>
    <lastmod>2026-05-30</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  // Database Connection Status Endpoint
  app.get("/api/db-status", async (req, res) => {
    const isConfigured = !!process.env.MYSQL_HOST;
    let connected = false;
    let errStr = mysqlError;

    if (isConfigured) {
      try {
        const pool = await getMysqlPool();
        connected = !!pool;
        if (!pool && !errStr) {
          errStr = "Connection initialization error";
        }
      } catch (e: any) {
        errStr = e.message || String(e);
      }
    }

    res.json({
      configured: isConfigured,
      connected,
      error: errStr,
      details: isConfigured ? {
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USER,
        port: process.env.MYSQL_PORT || "3306"
      } : null,
      firebase: {
        initialized: firebaseInitialized,
        projectId: firebaseApp?.options?.projectId || null,
        databaseId: "ai-studio-13f43520-5bb1-4092-b25d-93bf9fb99f1e"
      }
    });
  });

  // API routes for Gallery
  app.get("/api/gallery", async (req, res) => {
    try {
      const defaultSeeds = [
        {
          id: 'seed-1',
          title: 'حلقه طلا با نگین برلیان تراش گندمی',
          subtitle: 'حلقه و انگشتر',
          description: 'طراحی دست‌ساز ساخته شده از طلای ۱۸ عیار ابزارزنی شده با مخراج‌کاری دقیق برلیان‌های خالص.',
          imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
          category: 'rings',
          order: 10,
          createdAt: '2026-05-10T12:00:00.000Z'
        },
        {
          id: 'seed-2',
          title: 'دستبند طلا طرح کتیبه اسلیمی',
          subtitle: 'دستبند',
          description: 'ترکیب کتیبه‌های باستانی ایران و خطوط مدرن اسلیمی صیقل‌خورده با روکش با دوام نانو.',
          imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
          category: 'bracelets',
          order: 20,
          createdAt: '2026-05-15T12:00:00.000Z'
        },
        {
          id: 'seed-3',
          title: 'گردنبند زمرد نشان امپریال',
          subtitle: 'گردنبند',
          description: 'مدال مرکزی با نگین زمرد شناسنامه‌دار کلمبیایی احاطه‌شده توسط الماس‌های تراش مارکیز.',
          imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
          category: 'necklaces',
          order: 30,
          createdAt: '2026-05-20T12:00:00.000Z'
        },
        {
          id: 'seed-4',
          title: 'نیم‌ست هندسی متالیک مدرن',
          subtitle: 'سرویس و نیم‌ست',
          description: 'قطعات خلاقانه با حجم‌پردازی‌های سه بعدی مدرن و پرداخت نهایی دستی توسط استادکاران کارگاه عسکرنژاد.',
          imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
          category: 'sets',
          order: 40,
          createdAt: '2026-05-25T12:00:00.000Z'
        }
      ];

      const pool = await getMysqlPool();
      if (pool) {
        let [rows] = await pool.query("SELECT * FROM gallery ORDER BY COALESCE(sort_order, 999999) ASC, createdAt DESC");
        if ((rows as any[]).length === 0) {
          console.log("MySQL gallery table empty. Seeding default items...");
          for (const item of defaultSeeds) {
            await pool.query(
              "INSERT INTO gallery (id, title, subtitle, imageUrl, description, category, createdAt, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [item.id, item.title, item.subtitle, item.imageUrl, item.description, item.category, item.createdAt, item.order]
            );
          }
          const [updatedRows] = await pool.query("SELECT * FROM gallery ORDER BY COALESCE(sort_order, 999999) ASC, createdAt DESC");
          rows = updatedRows;
        }

        const mapped = (rows as any[]).map(row => ({
          ...row,
          order: row.sort_order
        }));
        return res.json(mapped);
      }

      if (firebaseInitialized) {
        try {
          const colRef = collection(firestoreDb, "gallery");
          const snapshot = await getDocs(query(colRef));
          let results: any[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            results.push({ ...data, id: docSnap.id });
          });

          if (results.length === 0) {
            console.log("Firestore gallery collection empty. Seeding default items...");
            for (const item of defaultSeeds) {
              const docRef = doc(firestoreDb, "gallery", item.id);
              await setDoc(docRef, item);
              results.push(item);
            }
          }

          results.sort((a, b) => {
            const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999999;
            const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999999;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return b.createdAt.localeCompare(a.createdAt);
          });
          return res.json(results);
        } catch (fiError) {
          console.error("Firestore GET gallery error, falling back to data.json:", fiError);
        }
      }

      const data = await readDataFile();
      if (!data.gallery || Object.keys(data.gallery).length === 0) {
        console.log("Local JSON gallery database empty. Seeding default items...");
        data.gallery = {};
        for (const item of defaultSeeds) {
          data.gallery[item.id] = item;
        }
        await writeDataFile(data);
      }

      const gallery = data.gallery || {};
      const results = Object.values(gallery);
      results.sort((a: any, b: any) => {
        const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 999999;
        const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 999999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return b.createdAt.localeCompare(a.createdAt);
      });
      res.json(results);
    } catch (error: any) {
      console.error("GET gallery error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.id) {
        return res.status(400).json({ error: "Gallery item ID is required" });
      }
      const key = item.id;
      
      const pool = await getMysqlPool();
      if (pool) {
        const insertQuery = `
          INSERT INTO gallery (
            id, title, subtitle, imageUrl, description, category, createdAt, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            subtitle = VALUES(subtitle),
            imageUrl = VALUES(imageUrl),
            description = VALUES(description),
            category = VALUES(category),
            createdAt = VALUES(createdAt),
            sort_order = VALUES(sort_order)
        `;
        
        await pool.query(insertQuery, [
          key,
          item.title || '',
          item.subtitle || null,
          item.imageUrl || '',
          item.description || null,
          item.category || null,
          item.createdAt || new Date().toISOString(),
          item.order !== undefined && item.order !== null ? Number(item.order) : 999999
        ]);
        
        console.log(`Saved gallery item to MySQL with key: ${key}`);
        return res.json({ success: true, mode: 'mysql' });
      }

      let firebaseWarning = "";
      if (firebaseInitialized) {
        try {
          const docRef = doc(firestoreDb, "gallery", key);
          const dataToSave = {
            id: key,
            title: item.title || '',
            subtitle: item.subtitle || '',
            imageUrl: item.imageUrl || '',
            description: item.description || '',
            category: item.category || 'rings',
            order: item.order !== undefined && item.order !== null ? Number(item.order) : 999999,
            createdAt: item.createdAt || new Date().toISOString()
          };
          await setDoc(docRef, dataToSave);
          console.log(`Saved gallery item to Firestore with key: ${key}`);
          return res.json({ success: true, mode: 'firestore' });
        } catch (fiError: any) {
          console.error("Firestore POST gallery item error:", fiError);
          firebaseWarning = fiError.message || String(fiError);
        }
      }

      try {
        const data = await readDataFile();
        if (!data.gallery) data.gallery = {};
        data.gallery[key] = item;
        await writeDataFile(data);
        console.log(`Saved gallery item with key: ${key}`);
        return res.json({ 
          success: true, 
          mode: 'json', 
          warning: firebaseWarning || "Fell back to local storage" 
        });
      } catch (jsonErr: any) {
        console.error("Local JSON fallback save error:", jsonErr);
        throw new Error(firebaseWarning 
          ? `پایگاه ابری: ${firebaseWarning}. ذخیره محلی: ${jsonErr.message}` 
          : `ذخیره محلی ناموفق بود: ${jsonErr.message}`
        );
      }
    } catch (error: any) {
      console.error("POST gallery item error:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const pool = await getMysqlPool();
      if (pool) {
        await pool.query("DELETE FROM gallery WHERE id = ?", [id]);
        console.log(`Deleted gallery item from MySQL with key: ${id}`);
        // Also clean up local file if present
        try {
          const data = await readDataFile();
          if (data.gallery && data.gallery[id]) {
            delete data.gallery[id];
            await writeDataFile(data);
          }
        } catch (_) {}
        return res.json({ success: true, mode: 'mysql' });
      }

      if (firebaseInitialized) {
        try {
          const docRef = doc(firestoreDb, "gallery", id);
          await deleteDoc(docRef);
          console.log(`Deleted gallery item from Firestore with key: ${id}`);
          // Also clean up local file if present
          try {
            const data = await readDataFile();
            if (data.gallery && data.gallery[id]) {
              delete data.gallery[id];
              await writeDataFile(data);
            }
          } catch (_) {}
          return res.json({ success: true, mode: 'firestore' });
        } catch (fiError: any) {
          console.error("Firestore DELETE gallery item error:", fiError);
          return res.status(500).json({ error: `خطا در حذف از پایگاه داده ابری: ${fiError.message || String(fiError)}` });
        }
      }

      const data = await readDataFile();
      if (data.gallery && data.gallery[id]) {
        delete data.gallery[id];
        await writeDataFile(data);
        console.log(`Deleted gallery item from Local JSON with key: ${id}`);
        return res.json({ success: true, mode: 'json' });
      }
      
      console.log(`Gallery item with key ${id} not found in Local JSON`);
      return res.json({ success: true, mode: 'json', message: 'Item not found' });
    } catch (error: any) {
      console.error(`DELETE gallery item for ${req.params.id} error:`, error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // API routes
  app.get("/api/certificates", async (req, res) => {
    try {
      const pool = await getMysqlPool();
      if (pool) {
        const [rows] = await pool.query("SELECT * FROM certificates ORDER BY id DESC");
        const mapped = (rows as any[]).map(mapRowToCertificate);
        // If MySQL has fewer than embedded or is empty, merge with initialCertificatesMap
        const combined: Record<string, any> = { ...initialCertificatesMap };
        mapped.forEach((c: any) => {
          combined[c.id.toUpperCase()] = c;
        });
        const list = Object.values(combined);
        list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        return res.json(list);
      }

      if (firebaseInitialized) {
        try {
          const colRef = collection(firestoreDb, "certificates");
          const snapshot = await getDocs(query(colRef));
          const combined: Record<string, any> = { ...initialCertificatesMap };
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            combined[docSnap.id.toUpperCase()] = { ...data, id: docSnap.id };
          });
          const results = Object.values(combined);
          results.sort((a, b) => String(b.id).localeCompare(String(a.id)));
          return res.json(results);
        } catch (fiError) {
          console.error("Firestore GET certificates error, falling back to data.json:", fiError);
        }
      }

      const certs = await readDataFile();
      const list = Object.values(certs);
      list.sort((a: any, b: any) => String(b.id).localeCompare(String(a.id)));
      res.json(list);
    } catch (error: any) {
      console.error("GET certificates error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/certificates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const key = id.toUpperCase();
      
      const pool = await getMysqlPool();
      if (pool) {
        const [rows] = await pool.query("SELECT * FROM certificates WHERE UPPER(id) = ?", [key]);
        const matched = (rows as any[])[0];
        if (matched) {
          return res.json(mapRowToCertificate(matched));
        }
      }

      if (firebaseInitialized) {
        try {
          const docRef = doc(firestoreDb, "certificates", key);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return res.json(docSnap.data());
          }
        } catch (fiError) {
          console.error(`Firestore GET certificate ${key} error, falling back to data.json:`, fiError);
        }
      }

      const certs = await readDataFile();
      const cert = certs[key] || initialCertificatesMap[key];
      res.json(cert || null);
    } catch (error: any) {
      console.error(`GET certificate direct lookup for ${req.params.id} error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/certificates", async (req, res) => {
    try {
      const cert = req.body;
      if (!cert || !cert.id) {
        return res.status(400).json({ error: "Certificate ID is required" });
      }
      const key = cert.id.toUpperCase();
      
      const pool = await getMysqlPool();
      if (pool) {
        const insertQuery = `
          INSERT INTO certificates (
            id, certificateNo, ownerName, assayDate, metalType,
            declaredPurity, testedPurity, weight, inspector, status,
            itemType, labBranch, qrValue, remarks, sendSms,
            showGoldWeight_reg, showCustomerName, showWeight, sampleRegistered, showSampleWeight,
            showActive, showGoldWeight, showPrepTime, prepTime, showTitle,
            titleSelect, wageType, wageAmount, documentType, packetNumber
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            certificateNo = VALUES(certificateNo),
            ownerName = VALUES(ownerName),
            assayDate = VALUES(assayDate),
            metalType = VALUES(metalType),
            declaredPurity = VALUES(declaredPurity),
            testedPurity = VALUES(testedPurity),
            weight = VALUES(weight),
            inspector = VALUES(inspector),
            status = VALUES(status),
            itemType = VALUES(itemType),
            labBranch = VALUES(labBranch),
            qrValue = VALUES(qrValue),
            remarks = VALUES(remarks),
            sendSms = VALUES(sendSms),
            showGoldWeight_reg = VALUES(showGoldWeight_reg),
            showCustomerName = VALUES(showCustomerName),
            showWeight = VALUES(showWeight),
            sampleRegistered = VALUES(sampleRegistered),
            showSampleWeight = VALUES(showSampleWeight),
            showActive = VALUES(showActive),
            showGoldWeight = VALUES(showGoldWeight),
            showPrepTime = VALUES(showPrepTime),
            prepTime = VALUES(prepTime),
            showTitle = VALUES(showTitle),
            titleSelect = VALUES(titleSelect),
            wageType = VALUES(wageType),
            wageAmount = VALUES(wageAmount),
            documentType = VALUES(documentType),
            packetNumber = VALUES(packetNumber)
        `;
        
        await pool.query(insertQuery, [
          key,
          cert.certificateNo || '',
          cert.ownerName || '',
          cert.assayDate || '',
          cert.metalType || 'gold',
          cert.declaredPurity || '',
          parseFloat(cert.testedPurity) || 0,
          parseFloat(cert.weight) || 0,
          cert.inspector || '',
          cert.status || 'approved',
          cert.itemType || '',
          cert.labBranch || '',
          cert.qrValue || '',
          cert.remarks || null,
          cert.sendSms === true || cert.sendSms === 1 ? 1 : 0,
          cert.showGoldWeight_reg === true || cert.showGoldWeight_reg === 1 ? 1 : 0,
          cert.showCustomerName === true || cert.showCustomerName === 1 ? 1 : 0,
          cert.showWeight === true || cert.showWeight === 1 ? 1 : 0,
          cert.sampleRegistered || '',
          cert.showSampleWeight === true || cert.showSampleWeight === 1 ? 1 : 0,
          cert.showActive === true || cert.showActive === 1 ? 1 : 0,
          cert.showGoldWeight === true || cert.showGoldWeight === 1 ? 1 : 0,
          cert.showPrepTime === true || cert.showPrepTime === 1 ? 1 : 0,
          cert.prepTime || '',
          cert.showTitle === true || cert.showTitle === 1 ? 1 : 0,
          cert.titleSelect || '',
          cert.wageType || null,
          cert.wageAmount || null,
          cert.documentType || 'hallmark',
          cert.packetNumber || null
        ]);
        
        console.log(`Saved certificate to MySQL with key: ${key}`);
        return res.json({ success: true, mode: 'mysql' });
      }

      if (firebaseInitialized) {
        try {
          const docRef = doc(firestoreDb, "certificates", key);
          const dataToSave = {
            id: key,
            certificateNo: cert.certificateNo || '',
            ownerName: cert.ownerName || '',
            assayDate: cert.assayDate || '',
            metalType: cert.metalType || 'gold',
            declaredPurity: cert.declaredPurity || '',
            testedPurity: parseFloat(cert.testedPurity) || 0,
            weight: parseFloat(cert.weight) || 0,
            inspector: cert.inspector || '',
            status: cert.status || 'approved',
            itemType: cert.itemType || '',
            labBranch: cert.labBranch || '',
            qrValue: cert.qrValue || '',
            remarks: cert.remarks || null,
            sendSms: cert.sendSms === true || cert.sendSms === 1,
            showGoldWeight_reg: cert.showGoldWeight_reg === true || cert.showGoldWeight_reg === 1,
            showCustomerName: cert.showCustomerName === true || cert.showCustomerName === 1,
            showWeight: cert.showWeight === true || cert.showWeight === 1,
            sampleRegistered: cert.sampleRegistered || '',
            showSampleWeight: cert.showSampleWeight === true || cert.showSampleWeight === 1,
            showActive: cert.showActive === true || cert.showActive === 1,
            showGoldWeight: cert.showGoldWeight === true || cert.showGoldWeight === 1,
            showPrepTime: cert.showPrepTime === true || cert.showPrepTime === 1,
            prepTime: cert.prepTime || '',
            showTitle: cert.showTitle === true || cert.showTitle === 1,
            titleSelect: cert.titleSelect || '',
            wageType: cert.wageType || null,
            wageAmount: cert.wageAmount || null,
            documentType: cert.documentType || 'hallmark',
            packetNumber: cert.packetNumber || null,
            createdAt: cert.createdAt || new Date().toISOString()
          };
          await setDoc(docRef, dataToSave);
          console.log(`Saved certificate to Firestore with key: ${key}`);
          return res.json({ success: true, mode: 'firestore' });
        } catch (fiError) {
          console.error("Firestore POST certificate error, falling back to data.json:", fiError);
        }
      }

      const certs = await readDataFile();
      certs[key] = cert;
      await writeDataFile(certs);
      console.log(`Saved certificate with key: ${key}`);
      res.json({ success: true, mode: 'json' });
    } catch (error: any) {
      console.error("POST certificate error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/certificates/bulk", async (req, res) => {
    try {
      const list = req.body;
      if (!Array.isArray(list) || list.length === 0) {
        return res.status(400).json({ error: "Array of certificates required" });
      }

      const pool = await getMysqlPool();
      if (pool) {
        const insertQuery = `
          INSERT INTO certificates (
            id, certificateNo, ownerName, assayDate, metalType,
            declaredPurity, testedPurity, weight, inspector, status,
            itemType, labBranch, qrValue, remarks, sendSms,
            showGoldWeight_reg, showCustomerName, showWeight, sampleRegistered, showSampleWeight,
            showActive, showGoldWeight, showPrepTime, prepTime, showTitle,
            titleSelect, wageType, wageAmount, documentType, packetNumber
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            certificateNo = VALUES(certificateNo),
            ownerName = VALUES(ownerName),
            assayDate = VALUES(assayDate),
            metalType = VALUES(metalType),
            declaredPurity = VALUES(declaredPurity),
            testedPurity = VALUES(testedPurity),
            weight = VALUES(weight),
            inspector = VALUES(inspector),
            status = VALUES(status),
            itemType = VALUES(itemType),
            labBranch = VALUES(labBranch),
            qrValue = VALUES(qrValue),
            remarks = VALUES(remarks),
            sendSms = VALUES(sendSms),
            showGoldWeight_reg = VALUES(showGoldWeight_reg),
            showCustomerName = VALUES(showCustomerName),
            showWeight = VALUES(showWeight),
            sampleRegistered = VALUES(sampleRegistered),
            showSampleWeight = VALUES(showSampleWeight),
            showActive = VALUES(showActive),
            showGoldWeight = VALUES(showGoldWeight),
            showPrepTime = VALUES(showPrepTime),
            prepTime = VALUES(prepTime),
            showTitle = VALUES(showTitle),
            titleSelect = VALUES(titleSelect),
            wageType = VALUES(wageType),
            wageAmount = VALUES(wageAmount),
            documentType = VALUES(documentType),
            packetNumber = VALUES(packetNumber)
        `;

        for (const cert of list) {
          if (!cert || (!cert.id && !cert.certificateNo)) continue;
          const key = (cert.id || cert.certificateNo).toString().trim().toUpperCase();
          await pool.query(insertQuery, [
            key,
            cert.certificateNo || `ATC-${key}`,
            cert.ownerName || '',
            cert.assayDate || '',
            cert.metalType || 'gold',
            cert.declaredPurity || '',
            parseFloat(cert.testedPurity) || 0,
            parseFloat(cert.weight) || 0,
            cert.inspector || '',
            cert.status || 'approved',
            cert.itemType || '',
            cert.labBranch || '',
            cert.qrValue || '',
            cert.remarks || null,
            cert.sendSms === true || cert.sendSms === 1 ? 1 : 0,
            cert.showGoldWeight_reg === true || cert.showGoldWeight_reg === 1 ? 1 : 0,
            cert.showCustomerName === true || cert.showCustomerName === 1 ? 1 : 0,
            cert.showWeight === true || cert.showWeight === 1 ? 1 : 0,
            cert.sampleRegistered || '',
            cert.showSampleWeight === true || cert.showSampleWeight === 1 ? 1 : 0,
            cert.showActive === true || cert.showActive === 1 ? 1 : 0,
            cert.showGoldWeight === true || cert.showGoldWeight === 1 ? 1 : 0,
            cert.showPrepTime === true || cert.showPrepTime === 1 ? 1 : 0,
            cert.prepTime || '',
            cert.showTitle === true || cert.showTitle === 1 ? 1 : 0,
            cert.titleSelect || '',
            cert.wageType || null,
            cert.wageAmount || null,
            cert.documentType || 'hallmark',
            cert.packetNumber || null
          ]);
        }
        console.log(`Saved bulk (${list.length}) certificates to MySQL`);
        return res.json({ success: true, count: list.length, mode: 'mysql' });
      }

      if (firebaseInitialized) {
        try {
          const batchSize = 400;
          for (let i = 0; i < list.length; i += batchSize) {
            const chunk = list.slice(i, i + batchSize);
            const batch = writeBatch(firestoreDb);
            for (const cert of chunk) {
              if (!cert || (!cert.id && !cert.certificateNo)) continue;
              const key = (cert.id || cert.certificateNo).toString().trim().toUpperCase();
              const docRef = doc(firestoreDb, "certificates", key);
              const dataToSave = {
                id: key,
                certificateNo: cert.certificateNo || `ATC-${key}`,
                ownerName: cert.ownerName || '',
                assayDate: cert.assayDate || '',
                metalType: cert.metalType || 'gold',
                declaredPurity: cert.declaredPurity || '',
                testedPurity: parseFloat(cert.testedPurity) || 0,
                weight: parseFloat(cert.weight) || 0,
                inspector: cert.inspector || '',
                status: cert.status || 'approved',
                itemType: cert.itemType || '',
                labBranch: cert.labBranch || '',
                qrValue: cert.qrValue || '',
                remarks: cert.remarks || null,
                sendSms: cert.sendSms === true || cert.sendSms === 1,
                showGoldWeight_reg: cert.showGoldWeight_reg === true || cert.showGoldWeight_reg === 1,
                showCustomerName: cert.showCustomerName === true || cert.showCustomerName === 1,
                showWeight: cert.showWeight === true || cert.showWeight === 1,
                sampleRegistered: cert.sampleRegistered || '',
                showSampleWeight: cert.showSampleWeight === true || cert.showSampleWeight === 1,
                showActive: cert.showActive === true || cert.showActive === 1,
                showGoldWeight: cert.showGoldWeight === true || cert.showGoldWeight === 1,
                showPrepTime: cert.showPrepTime === true || cert.showPrepTime === 1,
                prepTime: cert.prepTime || '',
                showTitle: cert.showTitle === true || cert.showTitle === 1,
                titleSelect: cert.titleSelect || '',
                wageType: cert.wageType || null,
                wageAmount: cert.wageAmount || null,
                documentType: cert.documentType || 'hallmark',
                packetNumber: cert.packetNumber || null,
                createdAt: cert.createdAt || new Date().toISOString()
              };
              batch.set(docRef, dataToSave);
            }
            await batch.commit();
          }
          console.log(`Saved bulk (${list.length}) certificates to Firestore`);
          return res.json({ success: true, count: list.length, mode: 'firestore' });
        } catch (fiError) {
          console.error("Firestore bulk POST certificates error, falling back to data.json:", fiError);
        }
      }

      const certs = await readDataFile();
      for (const cert of list) {
        if (!cert || (!cert.id && !cert.certificateNo)) continue;
        const key = (cert.id || cert.certificateNo).toString().trim().toUpperCase();
        certs[key] = cert;
      }
      await writeDataFile(certs);
      console.log(`Saved bulk (${list.length}) certificates to local data.json`);
      res.json({ success: true, count: list.length, mode: 'json' });
    } catch (error: any) {
      console.error("Bulk POST certificates error:", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.delete("/api/certificates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const key = id.toUpperCase();
      
      const pool = await getMysqlPool();
      if (pool) {
        await pool.query("DELETE FROM certificates WHERE UPPER(id) = ?", [key]);
        console.log(`Deleted certificate from MySQL with key: ${key}`);
        return res.json({ success: true, mode: 'mysql' });
      }

      if (firebaseInitialized) {
        try {
          const docRef = doc(firestoreDb, "certificates", key);
          await deleteDoc(docRef);
          console.log(`Deleted certificate from Firestore with key: ${key}`);
          return res.json({ success: true, mode: 'firestore' });
        } catch (fiError) {
          console.error("Firestore DELETE certificate error, falling back to data.json:", fiError);
        }
      }

      const certs = await readDataFile();
      delete certs[key];
      await writeDataFile(certs);
      console.log(`Deleted certificate with key: ${key}`);
      res.json({ success: true, mode: 'json' });
    } catch (error: any) {
      console.error(`DELETE certificate for ${req.params.id} error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
