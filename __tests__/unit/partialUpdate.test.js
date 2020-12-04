const sqlForPartialUpdate = require("../../helpers/partialUpdate");

describe("partialUpdate()", () => {
  it("should generate a proper partial update query with just 1 field",
      function () {
        const {query, values} = sqlForPartialUpdate(
          "users",
          {first_name: "Will", last_name: "Smith"},
          "username",
          "newuser"
      );
  
      expect(query).toEqual(
          "UPDATE users SET first_name=$1, last_name=$2 WHERE username=$3 RETURNING *"
      );
  
      expect(values).toEqual(["Will","Smith", "newuser"]);
    });

    it("it should not update key starting with '_' ", function (){
      const {query, values} = sqlForPartialUpdate(
        "users",
        {_name: "Error", correct_name:"Test"},
        "username",
        "testuser1"
      );
        expect(query).toEqual("UPDATE users SET correct_name=$1 WHERE username=$2 RETURNING *");
        expect(values).toEqual(["Test", "testuser1"]);
    })
});
