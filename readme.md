I made this for my own use because it seemed easier than actually doing math. When playing [Satisfactory](https://www.satisfactorygame.com/)

## Example

### Input

```yaml
steelBeam: 100
steelPipe: 100
concrete: 100
```

### Output

```json
{
  "buildings": [
    {
      "jobIDs": [
        "625b28"
      ],
      "building": "constructor",
      "formula": {
        "inputs": [
          {
            "item": "steelIngot",
            "num": 60
          },
          {
            "item": "power",
            "num": 4
          }
        ],
        "outputs": {
          "item": "steelBeam",
          "num": 15
        },
        "building": "constructor"
      },
      "destinations": [
        {
          "jobID": null,
          "num": 100
        }
      ],
      "outputMinimum": 100,
      "scale": 7,
      "outputTotal": 105,
      "surplus": 5
    },
    {
      "jobIDs": [
        "285b74"
      ],
      "building": "constructor",
      "formula": {
        "inputs": [
          {
            "item": "steelIngot",
            "num": 30
          },
          {
            "item": "power",
            "num": 4
          }
        ],
        "outputs": {
          "item": "steelPipe",
          "num": 20
        },
        "building": "constructor"
      },
      "destinations": [
        {
          "jobID": null,
          "num": 100
        }
      ],
      "outputMinimum": 100,
      "scale": 5,
      "outputTotal": 100,
      "surplus": 0
    },
    {
      "jobIDs": [
        "0dc24a"
      ],
      "building": "constructor",
      "formula": {
        "inputs": [
          {
            "item": "limestone",
            "num": 45
          },
          {
            "item": "power",
            "num": 4
          }
        ],
        "outputs": {
          "item": "concrete",
          "num": 15
        },
        "building": "constructor"
      },
      "destinations": [
        {
          "jobID": null,
          "num": 100
        }
      ],
      "outputMinimum": 100,
      "scale": 7,
      "outputTotal": 105,
      "surplus": 5
    },
    {
      "jobIDs": [
        "ecc805",
        "a50300"
      ],
      "building": "foundry",
      "formula": {
        "inputs": [
          {
            "item": "iron",
            "num": 45
          },
          {
            "item": "coal",
            "num": 45
          },
          {
            "item": "power",
            "num": 16
          }
        ],
        "outputs": {
          "item": "steelIngot",
          "num": 45
        },
        "building": "foundry"
      },
      "destinations": [
        {
          "jobID": "625b28",
          "num": 420
        },
        {
          "jobID": "285b74",
          "num": 150
        }
      ],
      "outputMinimum": 570,
      "scale": 13,
      "outputTotal": 585,
      "surplus": 15
    }
  ],
  "resources": {
    "power": 284,
    "limestone": 315,
    "iron": 585,
    "coal": 585
  }
}

```