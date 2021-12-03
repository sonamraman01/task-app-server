const express = require("express");
var sqlite3 = require("sqlite3").verbose();
var cors = require("cors");
var db = new sqlite3.Database("todos.db");
const app = express();
app.use(cors());
app.use(express.json());

const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: "./todos.db",
  },
  useNullAsDefault: true,
});

const bookshelf = require("bookshelf")(knex);

const User = bookshelf.model("User", {
  tableName: "users",
});

db.run(
  "CREATE TABLE if not exists users (id INTEGER primary key autoincrement, username varchar(200), email varchar(200), password varchar(200))"
);

app.post("/user", (req, res) => {
  const user = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
  };
  const sql = `INSERT into users (username, email, password) values (
  "${user.username}" , "${user.email}" , "${user.password}" )`;
  db.run(sql, function () {
    res.json({
      success: true,
      message: "Inserted Successfully",
      payload: { ...user, id: this.lastID },
    });
  });
});

app.get("/user", (req, res) => {
  const user = [];
  db.each(
    "SELECT * from users",
    function (err, row) {
      user.push({ ...row });
    },
    function () {
      res.json({
        success: true,
        payload: user,
      });
    }
  );
});

app.delete("/user/:id", (req, res) => {
  db.run(
    "DELETE from users WHERE id = $id",
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Deleted Successfully",
      });
    }
  );
});

app.post("/", (req, res) => {
  new User({ email: req.body.email, password: req.body.password })
    .fetch()
    .then(processUser)
    .catch(catchErrors);

  function processUser(user) {
    console.log(user);
    res.json({
      success: true,
      message: "Login Successfully",
      payload: user,
    });
  }

  function catchErrors(error) {
    console.log(error);
    res.json({
      success: false,
      message: "Login Failed",
    });
  }
});

// Todo Table

db.run(
  "CREATE TABLE if not exists todo (id INTEGER primary key autoincrement, title varchar(200), description varchar(200), isCompleted int(1))"
);

const todos = [];

app.get("/todo", (req, res) => {
  const todos = [];
  db.each(
    "SELECT * from todo",
    function (err, row) {
      todos.push({ ...row, isCompleted: row.isCompleted === 1 });
    },
    function () {
      res.json({
        success: true,
        payload: todos,
      });
    }
  );
});

app.get("/todo/:id", (req, res) => {
  const todo = [];
  db.each(
    "SELECT * from todo WHERE id = $id",
    {
      $id: req.params.id,
    },
    function (err, row) {
      todo.push({
        title: row.title,
        description: row.description,
        isCompleted: row.isCompleted === 1,
      });
    },
    function () {
      res.json({
        success: true,
        payload: todo,
      });
    }
  );
});

app.post("/todo", (req, res) => {
  const todo = {
    title: req.body.title,
    description: req.body.description,
    isCompleted: false,
  };
  db.run(
    "INSERT into todo(title, description, isCompleted) values('" +
      todo.title +
      "', '" +
      todo.description +
      "',0)",
    function () {
      res.json({
        success: true,
        message: "Inserted Successfully",
        payload: { ...todo, id: this.lastID },
      });
    }
  );
});

app.patch("/todo/:id", (req, res) => {
  const todo = {
    title: req.body.title,
    description: req.body.description,
    isCompleted: false,
  };
  db.run(
    `UPDATE todo SET title = "${todo.title}", description= "${todo.description}", isCompleted= "${todo.isCompleted}" WHERE id = $id`,
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Updated Successfully",
        payload: { ...todo, update: this.changes },
      });
    }
  );
});

app.delete("/todo/:id", (req, res) => {
  db.run(
    "DELETE from todo WHERE id = $id",
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Deleted Successfully",
      });
    }
  );
});

app.delete("/todo", (req, res) => {
  db.run("DELETE from todo WHERE 1", function () {
    res.json({
      success: true,
      message: "All Items deleted successfully",
    });
  });
});

// Project Table

db.run(
  "CREATE TABLE if not exists projects (id INTEGER primary key autoincrement, title varchar(200), description varchar(200), client varchar(200), start DATETIME , end DATETIME )"
);

app.post("/project", (req, res) => {
  const project = {
    title: req.body.title,
    description: req.body.description,
    client: req.body.client,
    start: req.body.start,
    end: req.body.end,
  };
  const sql = `INSERT into projects (title, description, client, start, end) values (
  "${project.title}" , "${project.description}" , "${project.client}" , '${project.start}', '${project.end}' )`;
  db.run(sql, function () {
    res.json({
      success: true,
      message: "Inserted Successfully",
      payload: { ...project, id: this.lastID },
    });
  });
});

app.patch("/project/:id", (req, res) => {
  const project = {
    title: req.body.title,
    description: req.body.description,
    client: req.body.client,
    start: req.body.start,
    end: req.body.end,
  };
  db.run(
    `UPDATE projects SET title = "${project.title}", description= "${project.description}", client = "${project.client}", start= '${project.start}', end = '${project.end}'  WHERE id = $id`,
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Updated Successfully",
        payload: { ...project, update: this.changes },
      });
    }
  );
});

app.get("/project", (req, res) => {
  const projects = [];
  db.each(
    "SELECT * from projects",
    function (err, row) {
      projects.push({ ...row });
    },
    function () {
      res.json({
        success: true,
        payload: projects,
      });
    }
  );
});

app.get("/project/:id", (req, res) => {
  const projects = [];
  db.each(
    "SELECT * from projects WHERE id = $id",
    {
      $id: req.params.id,
    },
    function (err, row) {
      projects.push({ ...row });
    },
    function () {
      res.json({
        success: true,
        payload: projects,
      });
    }
  );
});

app.delete("/project/:id", (req, res) => {
  db.run(
    "DELETE from projects WHERE id = $id",
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Deleted Successfully",
      });
    }
  );
});

app.delete("/project", (req, res) => {
  db.run("DELETE from projects WHERE 1", function () {
    res.json({
      success: true,
      message: "All Items deleted successfully",
    });
  });
});

// Task Table

db.get("PRAGMA foreign_keys = ON");

db.run(
  "CREATE TABLE if not exists tasks (id INTEGER primary key autoincrement, title varchar(200), description varchar(200), start DATETIME , end DATETIME, assigned_to INTEGER, project_id INTEGER , isCompleted int(1), FOREIGN KEY (assigned_to) REFERENCES users (id), FOREIGN KEY (project_id) REFERENCES projects (id)  )"
);

app.post("/task", (req, res) => {
  const task = {
    title: req.body.title,
    description: req.body.description,
    start: req.body.start,
    end: req.body.end,
    assigned_to: req.body.assigned_to,
    project_id: req.body.project_id,
    isCompleted: false,
  };
  const sql = `INSERT into tasks (title, description, start, end, assigned_to, project_id, isCompleted) values (
  "${task.title}" , "${task.description}" , '${task.start}', '${task.end}', ${task.assigned_to}, ${task.project_id}, ${task.isCompleted} )`;
  db.run(sql, function () {
    res.json({
      success: true,
      message: "Inserted Successfully",
      payload: { ...task, id: this.lastID },
    });
  });
});

app.patch("/task/:id", (req, res) => {
  const task = {
    title: req.body.title,
    description: req.body.description,
    start: req.body.start,
    end: req.body.end,
    assigned_to: req.body.assigned_to,
    project_id: req.body.project_id,
    isCompleted: false,
  };
  db.run(
    `UPDATE tasks SET title = "${task.title}", description= "${task.description}", start= '${task.start}', end = '${task.end}', assigned_to= ${task.assigned_to}, project_id= ${task.project_id}   WHERE id = $id`,
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Updated Successfully",
        payload: { ...task, update: this.changes },
      });
    }
  );
});

app.get("/task", (req, res) => {
  const tasks = [];
  db.each(
    "SELECT * from tasks",
    function (err, row) {
      tasks.push({ ...row });
    },
    function () {
      res.json({
        success: true,
        payload: tasks,
      });
    }
  );
});

app.get("/task/:id", (req, res) => {
  const task = [];
  db.each(
    "SELECT * from tasks WHERE id = $id",
    {
      $id: req.params.id,
    },
    function (err, row) {
      task.push({ ...row });
    },
    function () {
      res.json({
        success: true,
        payload: task,
      });
    }
  );
});

app.delete("/task/:id", (req, res) => {
  db.run(
    "DELETE from tasks WHERE id = $id",
    {
      $id: req.params.id,
    },
    function () {
      res.json({
        success: true,
        message: "Deleted Successfully",
      });
    }
  );
});

app.delete("/task", (req, res) => {
  db.run("DELETE from tasks WHERE 1", function () {
    res.json({
      success: true,
      message: "All Items deleted successfully",
    });
  });
});

// app.delete("/", (req, res) => {
//   db.run("DROP TABLE IF EXISTS tasks", function () {
//     res.json({
//       success: true,
//       message: "Deleted Successfully",
//     });
//   });
// });

// const todos = [];
// const app = express();
// app.use(express.json())

// app.get('/', (req, res) => {
//     res.json(todos);
// })

// app.post('/', (req, res) => {
//   const todo = {id: todos.length+1,title: req.body.title, isCompleted: false};
//   todos.push(todo);
//   res.json(todos);
// })

// app.delete("/:id", (req, res) => {
//   const index = todos.findIndex((a) => a.id == req.params.id);
//   if (index !== -1) {
//     todos.splice(index, 1);
//   }
//   res.json(todos);
// });

// app.post("/complete/:id", (req, res) => {
//   const index = todos.findIndex((a) => a.id == req.params.id);
//   if (index !== -1) {
//     todos[index].isCompleted = true;
//   }
//   res.json(todos);
// });

// app.post("/update/:id", (req, res) => {
//   const index = todos.findIndex((a) => a.id == req.params.id);
//   if (index !== -1) {
//     todos[index].title = "hello";
//   }
//   res.json(todos);
// });

// app.post("/items/:id", (req, res) => {
//   const index = todos.findIndex((a) => a.id == req.params.id);
//   if (index !== -1) {
//     todos[index].desc = "hello desc";
//   }
//   res.json(todos);
// });

const port = process.env.port || 5000;

app.listen(port, () => console.log(`Server started on port ${port}`));
