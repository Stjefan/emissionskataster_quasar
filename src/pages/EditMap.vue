<template>
  <q-page padding>
    <q-btn label="Hochgeladenes Bild anzeigen" @click="show" />
    <q-btn label="Speichern" @click="patch" />
    <q-input type="file" v-model="file2upload" />
    <div class="row">
      <div class="col-6">
        <q-table :rows="pointsOnMap" :columns="cols">
          <template v-slot:top>
            <q-btn
              color="primary"
              label="Referenzpunkt hinzufügen"
              @click="addReferenzpunkt"
            />
          </template>
          <template v-slot:body-cell-pixelx="props">
            <q-td>
              <q-input v-model.number="props.row.pixel_x" type="number" />
            </q-td>
          </template>
          <template v-slot:body-cell-pixely="props">
            <q-td>
              <q-input v-model.number="props.row.pixel_y" type="number" />
            </q-td>
          </template>
          <template v-slot:body-cell-gkrechts="props">
            <q-td>
              <q-input
                v-model.number="props.row.koordinaten.gk_rechts"
                type="number"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-gkhoch="props">
            <q-td>
              <q-input
                v-model.number="props.row.koordinaten.gk_hoch"
                type="number"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-delete="props">
            <q-td>
              <q-btn label="X" @click="remove(props.row)" />
            </q-td>
          </template>
        </q-table>
        <q-btn label="Georeferenzierung erstellen" @click="georeferenzieren" />
      </div>
      <div
        style="background-color: lightgray; height: 50vh; overflow: hidden"
        class="col-6"
      >
        <div
          id="zoomPan"
          style="
            height: 10000px;
            min-width: 1900px;
            background-color: darkgray;
            padding: 5px;
          "
        >
          <img
            :src="imgSource"
            style="position: absolute"
            fit="none"
            position="0 0"
            id="myImage"
          />
          <q-menu context-menu id="ctxmenu" @show="saveCoordinates">
            <q-list dense style="min-width: 100px">
              <q-item clickable v-close-popup>
                <q-item-section @click="addReferenzpunkt('lastClickPosition')"
                  >Georeferenzpunkt erstellen</q-item-section
                >
              </q-item>
            </q-list>
          </q-menu>
          <svg
            style="
              height: 200%;
              width: 200%;
              position: absolute;
              pointer-events: all;
            "
            @mousedown="showClickPosition"
          >
            <circle
              :cx="b.pixel_x"
              :cy="b.pixel_y"
              r="5"
              v-for="b in pointsOnMap"
              :key="b.id"
              :style="{ fill: 'red' }"
            />
          </svg>
        </div>
      </div>
    </div>
    <p>{{ positionLastClick }}</p>
    <p>{{ positionGkLastClick }}</p>
    <p>{{ myMatrix }}</p>
    <div class="row">
      <q-btn label="2-Georef" @click="compute2PointGeoref" />
      <q-btn label="Test it" @click="transform_pixel_2_gk(243617, 124098)" />
    </div>
  </q-page>
</template>

<script>
import math, {
  inv,
  matrix,
  multiply,
  transpose,
  norm,
  add,
  atan2,
  sin,
  cos,
} from "mathjs";
import { api } from "src/boot/axios";
import { ref, computed, onMounted } from "vue";
import panzoom from "panzoom";

const defaultVertex = {
  gk_hoch: 522421.36,
  gk_rechts: 5408060.65,
};
const defaultPointOnMap = {
  koordinaten: { gk_rechts: 0, gk_hoch: 0 },
  pixel_x: 0,
  pixel_y: 0,
};

const points4Test = [
  {
    koordinaten: { gk_rechts: 4113212, gk_hoch: 2713389 },
    pixel_x: 333142,
    pixel_y: 649243,
  },
  {
    koordinaten: { gk_rechts: 4398831, gk_hoch: 2524846 },
    pixel_x: 601676,
    pixel_y: 437094,
  },
  {
    koordinaten: { gk_rechts: 4271727, gk_hoch: 2141231 },
    pixel_x: 442371,
    pixel_y: 65701,
  },
  {
    koordinaten: { gk_rechts: 3974954, gk_hoch: 2318931 },
    pixel_x: 161810,
    pixel_y: 268017,
  },
];
export default {
  // name: 'PageName',

  props: ["id", "idMapOwner", "mode", "type"],
  setup(props) {
    const file2upload = ref(null);
    const imgSource = ref("");
    const pointsOnMap = ref([]);
    const idMap = ref(props.id != null ? props.id : 24);
    const currentlyModifiedMap = ref(null);

    const myMatrix = ref({});

    let current_px_2_gk_transform = null;

    function remove(row) {
      console.log("row", row);
      const idx = pointsOnMap.value.findIndex((i) => i === row);
      if (idx != -1) {
        console.log("Removing", idx);
        pointsOnMap.value.splice(idx, 1);
      }
    }

    function transform_pixel_2_gk(x, y) {
      if (current_px_2_gk_transform) {
        console.log("Run computation", current_px_2_gk_transform);
        let intermediate_result = multiply(current_px_2_gk_transform, [
          [1],
          [x],
          [y],
        ]);
        const result = {
          gk_rechts: intermediate_result[0][0],
          gk_hoch: intermediate_result[1][0],
        };
        console.log("result", result);
        return result;
      }
      return {
        gk_rechts: 0.03324358863506295 * x + 3492791,
        gk_hoch: 0.03324358863506295 * y + 3492806,
      };
    }

    function transform_gk_2_pixel(x, y) {
      if (current_px_2_gk_transform) {
        console.log("Run computation");
        console.log(x, y);
        const current_inv = inv([
          [current_px_2_gk_transform[0][1], current_px_2_gk_transform[0][2]],
          [current_px_2_gk_transform[1][1], current_px_2_gk_transform[1][2]],
        ]);
        console.log(
          multiply(current_inv, [
            [x - current_px_2_gk_transform[0][0]],
            [y - current_px_2_gk_transform[1][0]],
          ])
        );
      }
    }

    function show() {
      imgSource.value = URL.createObjectURL(file2upload.value[0]);
    }

    function read() {
      api.get(`/kataster/map/${idMap.value}/`).then((response) => {
        console.log(response.data.upload);
        console.log(response.data);
        currentlyModifiedMap.value = response.data;
        pointsOnMap.value =
          response.data.georeferenzierung.referenzierungspunkt_set;
        imgSource.value = response.data.upload;
        myMatrix.value = {
          x00: response.data.georeferenzierung.x00,
          x01: response.data.georeferenzierung.x01,
          x02: response.data.georeferenzierung.x02,
          x10: response.data.georeferenzierung.x10,
          x11: response.data.georeferenzierung.x11,
          x12: response.data.georeferenzierung.x12,
        };
        current_px_2_gk_transform = [
          [
            response.data.georeferenzierung.x00,
            response.data.georeferenzierung.x01,
            response.data.georeferenzierung.x02,
          ],
          [
            response.data.georeferenzierung.x10,
            response.data.georeferenzierung.x11,
            response.data.georeferenzierung.x12,
          ],
        ];
      });
    }

    function post() {
      const georeferenzierung_data = {
        referenzierungspunkt_set: [
          defaultPointOnMap,
          defaultPointOnMap,
          defaultPointOnMap,
        ],
        x00: 0,
        x01: 1,
        x02: 0,
        x10: 0,
        x11: 0,
        x12: 1,
        lower_left: defaultVertex,
        lower_right: defaultVertex,
        upper_right: defaultVertex,
        upper_left: defaultVertex,
      };
      // These values demonstrate the default options
      const myForm = new FormData();

      console.log("Running post");
      console.log(current_px_2_gk_transform, file2upload.value);

      myForm.append("upload", file2upload.value[0]);
      if (props.type == "dach") {
        myForm.append("roof_set", [props.idMapOwner]);
      } else if (props.type == "werk") {
        myForm.append("plant_set", [props.idMapOwner]);
      } else {
        throw new Exception("Invalid type");
      }

      api
        .post(
          "http://localhost:8000/kataster/map/",
          myForm
          // headers: formData.getHeaders(), //{ 'Content-Type': 'multipart/form-data' },
        )
        .then((response) => {
          console.log(response);
          if (my_georeferezierung_data != null) {
            return api.put(
              `http://localhost:8000/kataster/map/${response.data.id}/`,
              {
                georeferenzierung: {
                  referenzierungspunkt_set: pointsOnMap.value,
                  ...my_georeferezierung_data,
                },
              }
            );
          }
        })
        .then((response) => {
          console.log(response);
        });
    }

    function patch() {
      if (props.mode == "create") {
        post();
        return;
      }
      console.log("!!!");
      let formData = new FormData();
      if (file2upload.value != null) {
        formData.append("upload", file2upload.value[0]);
        api
          .patch(
            `http://localhost:8000/kataster/map/${idMap.value}/`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          )
          .then((response) => console.log(response));
      }

      if (current_px_2_gk_transform) {
        const georeferenzierung_data = {
          referenzierungspunkt_set: pointsOnMap.value,
          /*
          x00: current_px_2_gk_transform[0][0],
          x01: current_px_2_gk_transform[0][1],
          x02: current_px_2_gk_transform[0][2],
          x10: current_px_2_gk_transform[1][0],
          x11: current_px_2_gk_transform[1][1],
          x12: current_px_2_gk_transform[1][2],
          lower_left: currentlyModifiedMap.value.georeferenzierung.lower_left,
          lower_right: currentlyModifiedMap.value.georeferenzierung.lower_right,
          upper_right: currentlyModifiedMap.value.georeferenzierung.upper_right,
          upper_left: currentlyModifiedMap.value.georeferenzierung.upper_left,
          */
          ...myMatrix,
        };
        console.log(my_georeferezierung_data);

        console.log("????");
        api
          .patch(`http://localhost:8000/kataster/map/${idMap.value}/`, {
            georeferenzierung: {
              referenzierungspunkt_set: pointsOnMap.value,
              ...my_georeferezierung_data,
            },
          })
          .then((response) => {
            console.log("HHHHFDS");
            console.log(response);
          });
      }
    }
    const positionPixelLastClick = ref({ x: 0, y: 0 });
    const positionGkLastClick = ref({ x: 0, y: 0 });
    function showClickPosition(arg) {
      console.log("Show click position");
      positionPixelLastClick.value.x = arg.offsetX;
      positionPixelLastClick.value.y = arg.offsetY;
      positionGkLastClick.value = transform_pixel_2_gk(
        arg.offsetX,
        arg.offsetY
      );
      transform_gk_2_pixel(
        positionGkLastClick.value.gk_rechts,
        positionGkLastClick.value.gk_hoch
      );
    }

    const cols = [
      {
        field: "pixel_x",
        label: "Pixel X",
        name: "pixelx",
      },
      {
        field: "pixel_y",
        label: "Pixel Y",
        name: "pixely",
      },
      {
        field: (i) => i.koordinaten.gk_rechts,
        label: "GK-Rechts",
        name: "gkrechts",
      },
      {
        field: (i) => i.koordinaten.gk_hoch,
        label: "GK-Hoch",
        name: "gkhoch",
      },
      {
        label: "",
        name: "delete",
      },
    ];

    function compute2PointGeoref() {
      const p_x_a = pointsOnMap.value[0].pixel_x;
      const p_y_a = pointsOnMap.value[0].pixel_y;

      const p_gk_rechts_a = pointsOnMap.value[0].koordinaten.gk_rechts;
      const p_gk_hoch_a = pointsOnMap.value[0].koordinaten.gk_hoch;

      const p_x_b = pointsOnMap.value[1].pixel_x;
      const p_y_b = pointsOnMap.value[1].pixel_y;

      const p_gk_rechts_b = pointsOnMap.value[1].koordinaten.gk_rechts;
      const p_gk_hoch_b = pointsOnMap.value[1].koordinaten.gk_hoch;
      const v_gk = [p_gk_rechts_b - p_gk_rechts_a, p_gk_hoch_b - p_gk_hoch_a];
      const v_px = [p_x_b - p_x_a, p_y_b - p_y_a];

      console.log((atan2(v_gk[0], v_gk[1]) / (2 * Math.PI)) * 360);
      console.log((atan2(v_px[0], v_px[1]) / (2 * Math.PI)) * 360);

      // console.log((atan2(10, 10) / (2 * Math.PI)) * 360);
      const theta = atan2(v_px[0], v_px[1]) - atan2(v_gk[0], v_gk[1]);

      console.log((theta / (2 * Math.PI)) * 360, theta);

      const rotation_matrx = [
        [cos(theta), -sin(theta)],
        [sin(theta), cos(theta)],
      ];
      console.log("rotation_matrx", rotation_matrx);

      console.log(multiply(rotation_matrx, [[1], [0]]));

      console.log(v_gk, v_px);
      // console.log(norm(v_gk, 2));
      // console.log(norm(v_px, 2));
      const scaling = norm(v_gk, 2) / norm(v_px, 2);

      const scaling_rotation = multiply(rotation_matrx, scaling);

      console.log("assert == v_gk", scaling_rotation);

      const a_gk = [[p_gk_rechts_a], [p_gk_hoch_a]];
      const a_px = [[p_x_a], [p_y_a]];

      console.log(
        "Spiegelung:",
        multiply(scaling_rotation, multiply(-1, a_px))
      );

      const translation = add(
        a_gk,
        multiply(scaling_rotation, multiply(-1, a_px))
      );
      console.log(translation);

      console.log(scaling_rotation);

      current_px_2_gk_transform = [
        [translation[0][0], scaling_rotation[0][0], scaling_rotation[0][1]],
        [translation[1][0], scaling_rotation[1][0], scaling_rotation[1][1]],
      ];

      console.log(current_px_2_gk_transform);

      console.log(add(multiply(scaling_rotation, [[53], [105]]), translation));
      console.log(
        add(multiply(scaling_rotation, [[11304], [12560]]), translation)
      );
    }

    function addReferenzpunkt(args = null) {
      if (args == "lastClickPosition") {
        console.log(args);
        pointsOnMap.value.push({
          koordinaten: { gk_rechts: 0, gk_hoch: 0 },
          pixel_x: positionPixelLastClick.value.x,
          pixel_y: positionPixelLastClick.value.y,
        });
      } else {
        pointsOnMap.value.push({
          koordinaten: { gk_rechts: 0, gk_hoch: 0 },
          pixel_x: 0,
          pixel_y: 0,
        });
      }
    }
    let my_georeferezierung_data;
    function georeferenzieren() {
      console.log("create a matrix");
      const myLeastsquareArr = [];
      const myGkHochArr = [];
      const myGkRechtsArr = [];
      for (let el of pointsOnMap.value) {
        myLeastsquareArr.push([1, el.pixel_x, el.pixel_y]);
        myGkHochArr.push(el.koordinaten.gk_hoch);
        myGkRechtsArr.push(el.koordinaten.gk_rechts);
      }
      const myLeastsquareMatrix = matrix(myLeastsquareArr);
      const myGkHochVec = matrix(myGkHochArr);
      const myGkRechtsVec = matrix(myGkRechtsArr);

      console.log(myLeastsquareMatrix, myGkHochVec, myGkRechtsVec);

      let minizmizer = multiply(
        inv(multiply(transpose(myLeastsquareArr), myLeastsquareArr)),
        transpose(myLeastsquareArr)
      );
      console.log(minizmizer);
      console.log();
      let xWert = multiply(minizmizer, myGkRechtsVec);
      let yWert = multiply(minizmizer, myGkHochVec);
      let pixel_2_gk = [[], []];
      xWert.toString();

      xWert.forEach(function (value, index) {
        console.log("value:", value, "index:", index);
        pixel_2_gk[0].push(value);
      });
      yWert.forEach(function (value, index) {
        console.log("value:", value, "index:", index);
        pixel_2_gk[1].push(value);
      });
      for (let i of xWert) {
        console.log(i);
      }
      var element = document.getElementById("myImage");
      console.log(element);
      const a = element.clientHeight;
      const b = element.clientWidth;

      const upper_left_arr = multiply(pixel_2_gk, [[1], [0], [0]]);
      const upper_right_arr = multiply(pixel_2_gk, [[1], [0], [a]]);
      const lower_right_arr = multiply(pixel_2_gk, [[1], [b], [a]]);
      const lower_left_arr = multiply(pixel_2_gk, [[1], [b], [0]]);

      console.log(xWert);
      console.log("myResult", pixel_2_gk);

      current_px_2_gk_transform = pixel_2_gk;

      myMatrix.value = {
        x00: current_px_2_gk_transform[0][0],
        x01: current_px_2_gk_transform[0][1],
        x02: current_px_2_gk_transform[0][2],
        x10: current_px_2_gk_transform[1][0],
        x11: current_px_2_gk_transform[1][1],
        x12: current_px_2_gk_transform[1][2],
        upper_left: {
          gk_rechts: upper_left_arr[0][0],
          gk_hoch: upper_left_arr[1][0],
        },
        upper_right: {
          gk_rechts: upper_right_arr[0][0],
          gk_hoch: upper_right_arr[1][0],
        },
        lower_right: {
          gk_rechts: lower_right_arr[0][0],
          gk_hoch: lower_right_arr[1][0],
        },
        lower_left: {
          gk_rechts: lower_left_arr[0][0],
          gk_hoch: lower_left_arr[1][0],
        },
      };
      my_georeferezierung_data = {
        x00: current_px_2_gk_transform[0][0],
        x01: current_px_2_gk_transform[0][1],
        x02: current_px_2_gk_transform[0][2],
        x10: current_px_2_gk_transform[1][0],
        x11: current_px_2_gk_transform[1][1],
        x12: current_px_2_gk_transform[1][2],
        upper_left: {
          gk_rechts: upper_left_arr[0][0],
          gk_hoch: upper_left_arr[1][0],
        },
        upper_right: {
          gk_rechts: upper_right_arr[0][0],
          gk_hoch: upper_right_arr[1][0],
        },
        lower_right: {
          gk_rechts: lower_right_arr[0][0],
          gk_hoch: lower_right_arr[1][0],
        },
        lower_left: {
          gk_rechts: lower_left_arr[0][0],
          gk_hoch: lower_left_arr[1][0],
        },
      };
      console.log(myMatrix.value);
      return pixel_2_gk;

      // console.log(a); // [1, 4, 9, 16, 25]
      // const b = matrix(ones([2, 3]));
      // console.log(b); // [[1, 1, 1], [1, 1, 1]]
      // console.log(b.size()); // [2, 3]
    }

    function saveCoordinates(args) {
      console.log(args);
    }

    onMounted(() => {
      console.log("On mounted");
      // Enable zooming
      const element = document.getElementById("zoomPan");
      panzoom(element, {
        bounds: true,
        boundsPadding: 0.1,
        maxZoom: 5,
        minZoom: 0.1,
      });
      if (props.mode == "edit") {
        read();
      }
      pointsOnMap.value = points4Test;
    });

    return {
      saveCoordinates,
      georeferenzieren,
      cols,
      idMap,
      pointsOnMap,
      positionLastClick: positionPixelLastClick,
      positionGkLastClick,
      showClickPosition,
      read,
      patch,
      file2upload,
      imgSource,
      show,
      addReferenzpunkt,
      myMatrix,
      remove,
      compute2PointGeoref,
      transform_pixel_2_gk,
    };
  },
};
</script>
