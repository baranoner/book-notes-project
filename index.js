import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
dotenv.config();

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: process.env.DATABASE_PASSWORD,
  port: 5432,
});
db.connect();

app.get("/", async (req, res) => {
  var result = await db.query("SELECT book_info.id, book_info.name, book_info.isbn, book_info.date_read, book_info.rating, book_content.review FROM book_info JOIN book_content ON book_info.id = book_content.book_id ORDER BY book_info.id DESC;");
  var books_info = result.rows;

  books_info.forEach(book => {
    book.image = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
    book.date_read = book.date_read.toString().slice(3, 15);
  });
  
  res.render("home.ejs", {
    books_info: books_info,
  });
});

app.get("/books/:bookName", async (req, res) => {
  var searchTerm = req.params.bookName;
  var result = await db.query("SELECT book_info.id, book_info.name, book_info.isbn, book_info.date_read, book_info.rating, book_content.review, book_content.note FROM book_info JOIN book_content ON book_info.id = book_content.book_id WHERE book_info.name ILIKE '%' || $1 || '%';", 
  [searchTerm]
  );
  var book_info = result.rows[0];
 
  book_info.image = `https://covers.openlibrary.org/b/isbn/${book_info.isbn}-L.jpg`;
  book_info.date_read = book_info.date_read.toString().slice(3, 15);

  res.render("book.ejs", {
    book_info: book_info,
  })
});

app.get("/add", (req, res) => {
  res.render("add.ejs");
})

app.post("/post", async (req, res) => {
  var bookName = req.body.name;
  var rating = req.body.rating;
  var isbn = req.body.isbn;
  var review = req.body.review;
  var notes = req.body.notes;

  var result = await db.query("INSERT INTO book_info (name, isbn, rating) VALUES ($1, $2, $3) RETURNING id;", [bookName, isbn, rating]);
  var id = result.rows[0].id;
  db.query("INSERT INTO book_content (book_id, review, note) VALUES ($1, $2, $3);", [id, review, notes]);

  res.redirect("/");
})

app.post("/edit", async (req, res) => {
  var id = req.body.id;
  var result = await db.query("SELECT book_info.id, book_info.name, book_info.isbn, book_info.date_read, book_info.rating, book_content.review, book_content.note FROM book_info JOIN book_content ON book_info.id = book_content.book_id WHERE book_info.id = $1;", [id]);
  var book_info = result.rows[0];
  res.render("edit.ejs", {
    book_info: book_info,
  });
})

app.post("/editpost", (req, res) => {
  var id = req.body.id;
  var bookName = req.body.name;
  var rating = req.body.rating;
  var isbn = req.body.isbn;
  var review = req.body.review;
  var notes = req.body.notes;

  db.query("UPDATE book_info SET name = $1, rating = $2, isbn = $3 WHERE id = $4;", [bookName, rating, isbn, id]);
  db.query("UPDATE book_content SET review = $1, note = $2 WHERE book_id = $3", [review, notes, id]);

  res.redirect("/");
})

app.post("/delete", (req, res) => {
  var id = req.body.id;
  db.query("DELETE FROM book_content WHERE book_id = $1", [id]);
  db.query("DELETE FROM book_info WHERE id = $1", [id]);
  res.redirect("/");
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});