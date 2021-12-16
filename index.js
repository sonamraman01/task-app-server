const express = require("express");
var sqlite3 = require("sqlite3").verbose();
var cors = require("cors");
var db = new sqlite3.Database("todos.db");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "secretkey23456";
const expiresIn = 24 * 60 * 60;

const generateAuthToken = function (user) {
  const token = jwt.sign(
    {
      id: user?.id,
      email: user?.email,
      username: user?.username,
    },
    SECRET_KEY,
    {
      expiresIn: expiresIn,
      algorithm: "HS512",
    }
  );
  return token;
};

const authMiddleWare = async (req, res, next) => {
  try {
    const auth = req.header("Authorization");
    if (!auth) {
      return res.status(401).send({
        message: "Not authorized to do this action",
      });
    }
    const token = auth.replace("Bearer ", "");
    const data = jwt.verify(token, SECRET_KEY);
    db.get(
      `SELECT * from users where token="${token}" limit 1`,
      function (err, row) {
        if (err || !row) {
          return res.status(401).send({
            message: "Not valid token",
          });
        }
        req["user"] = {...data};
        next();
      }
    );
  } catch (e) {
    console.log(e);
    return res.status(404).json({ message: "Invalid token" });
  }
};

db.run(
  "CREATE TABLE if not exists users (id INTEGER primary key autoincrement, username varchar(200), email varchar(200) UNIQUE, password varchar(200), role varchar(200), token varchar(200))"
);

app.post("/user", (req, res) => {
  const user = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  };
  const sql = `INSERT into users (username, email, password, role) values (
  "${user.username}" , "${user.email}" , "${user.password}" , "${user.role}")`;
  db.run(sql, function () {
    res.json({
      success: true,
      message: "Inserted Successfully",
      payload: {
        ...user,
        id: this.lastID,
        // token: generateAuthToken(user),
      },
    });
  });
});

app.get("/user", authMiddleWare, (req, res) => {
  const user = [];
  db.each(
    "SELECT * from users",
    function (err, row) {
      delete row.password;
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
  db.get(
    `SELECT * from users WHERE email="${req.body.email}" AND password="${req.body.password}" limit 1`,
    // [req.body.email, req.body.password],
    (err, row) => {
      if (err)
        res.status(404).json({
          success: false,
          message: "Invalid email or password",
        });
      const token = generateAuthToken(row);
      db.run(
        `Update users SET token="${token}" WHERE id=${row?.id} `,
        function () {
          if(row)
          res.json({
            success: true,
            message: "Login Successful",
            payload: { ...row, token },
          });
          else{
            res.sendStatus(404)
          }
        }
      );
    }
  );
});

app.post("/logout", (req, res) => {
  db.get(`UPDATE users SET token=null where id= ${req.body.id}`, (err, row) => {
    res.json({
      success: true,
      message: "Logout Successful",
    });
  });
});

// Todo Table

db.run(
  "CREATE TABLE if not exists todo (id INTEGER primary key autoincrement, title varchar(200), description varchar(200), isCompleted int(1))"
);

const todos = [];

app.get("/todo", authMiddleWare, (req, res) => {
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

app.get("/todo/:id", authMiddleWare, (req, res) => {
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

app.post("/todo", authMiddleWare, (req, res) => {
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

app.patch("/todo/:id", authMiddleWare, (req, res) => {
  const todo = {
    title: req.body.title,
    description: req.body.description,
    isCompleted: false,
  };
  db.run(
    `UPDATE todo SET title = "${todo.title}", description= "${todo.description}", isCompleted= ${todo.isCompleted} WHERE id = $id`,
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

app.patch("/todo/isComplete/:id", authMiddleWare, (req, res) => {
  const todo = {
    isCompleted: req.body.isCompleted,
  };
  db.run(
    `UPDATE todo SET isCompleted= ${todo.isCompleted} WHERE id = $id`,
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

app.delete("/todo/:id", authMiddleWare, (req, res) => {
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

app.delete("/todo", authMiddleWare, (req, res) => {
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

app.post("/project", authMiddleWare, (req, res) => {
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

app.patch("/project/:id", authMiddleWare, (req, res) => {
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

app.get("/project", authMiddleWare, (req, res) => {
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

app.get("/project/:id", authMiddleWare, (req, res) => {
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

app.delete("/project/:id", authMiddleWare, (req, res) => {
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

app.delete("/project", authMiddleWare, (req, res) => {
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

app.post("/task", authMiddleWare, (req, res) => {
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

app.patch("/task/:id", authMiddleWare, (req, res) => {
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
    `UPDATE tasks SET title = "${task.title}", description= "${task.description}", start= '${task.start}', end = '${task.end}', assigned_to= ${task.assigned_to}, project_id= ${task.project_id}, isCompleted= ${task.isCompleted} WHERE id = $id`,
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

app.get("/task", authMiddleWare, (req, res) => {
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

app.get("/task/:id", authMiddleWare, (req, res) => {
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

app.delete("/task/:id", authMiddleWare, (req, res) => {
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

app.delete("/task", authMiddleWare, (req, res) => {
  db.run("DELETE from tasks WHERE 1", function () {
    res.json({
      success: true,
      message: "All Items deleted successfully",
    });
  });
});

// app.delete("/", (req, res) => {
//   db.run("DROP TABLE IF EXISTS users", function () {
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
