import { describe, expect, it } from "vitest";
import { autoMapColumns } from "../features/file-import/csvColumnMapping";

describe("autoMapColumns", () => {
  it("実際のCSVヘッダを列役割へ正しく割り当てる", () => {
    const headers = [
      "UnixTime",
      "Date",
      "LowerBack.ErrorCode",
      "LowerBack.Single.Euler.x",
      "LowerBack.Single.Euler.y",
      "LowerBack.Single.Euler.z",
      "RightLowerLeg.Single.Euler.y",
      "LeftLowerLeg.Single.Euler.y",
      "RightThigh.Single.Euler.y",
      "LeftThigh.Single.Euler.y",
      "RightKnee.Angle",
      "LeftKnee.Angle",
      "RightHip.Angle",
      "LeftHip.Angle",
    ];

    const mapping = autoMapColumns(headers);

    expect(mapping.time).toBe("UnixTime");
    expect(mapping.rightThighY).toBe("RightThigh.Single.Euler.y");
    expect(mapping.leftThighY).toBe("LeftThigh.Single.Euler.y");
    expect(mapping.rightShankY).toBe("RightLowerLeg.Single.Euler.y");
    expect(mapping.leftShankY).toBe("LeftLowerLeg.Single.Euler.y");
    expect(mapping.lowerBackX).toBe("LowerBack.Single.Euler.x");
    expect(mapping.rightKneeAngle).toBe("RightKnee.Angle");
    expect(mapping.leftKneeAngle).toBe("LeftKnee.Angle");
    expect(mapping.rightHipAngle).toBe("RightHip.Angle");
    expect(mapping.leftHipAngle).toBe("LeftHip.Angle");
  });

  it("前後空白・大文字小文字の違いを吸収する", () => {
    const headers = [" unixtime ", "RIGHTTHIGH.SINGLE.EULER.Y"];
    const mapping = autoMapColumns(headers);

    expect(mapping.time).toBe(" unixtime ");
    expect(mapping.rightThighY).toBe("RIGHTTHIGH.SINGLE.EULER.Y");
  });

  it("一致しない列はnullのまま残す（手動割当を要求）", () => {
    const headers = ["foo", "bar"];
    const mapping = autoMapColumns(headers);

    expect(mapping.time).toBeNull();
    expect(mapping.rightThighY).toBeNull();
  });
});
