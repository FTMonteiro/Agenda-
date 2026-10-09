import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { UserDTO } from "@slotix/types";
import { updateMe } from "./users";
import { translate } from "@/i18n";

// The API stores the avatar as a URL and has no file upload for it, so the photo is
// shrunk to a small square JPEG and saved as a data URL (~20–40 KB). That keeps it well
// under the API's JSON body limit and shows it everywhere the account's avatar is used.
const AVATAR_SIZE = 320;

export type AvatarSource = "library" | "camera";

// Opens the gallery or the camera with a square crop. Returns the picked image's URI, or
// null if the person cancelled. Throws a readable Error if permission was refused.
export async function pickAvatar(source: AvatarSource): Promise<string | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === "camera"
        ? translate("Permita o acesso à câmara para tirar uma foto de perfil.")
        : translate("Permita o acesso às suas fotos para escolher uma foto de perfil."),
    );
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result =
    source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  return result.canceled ? null : (result.assets?.[0]?.uri ?? null);
}

export async function uploadAvatar(uri: string): Promise<UserDTO> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: AVATAR_SIZE }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });

  if (!saved.base64) throw new Error(translate("Não foi possível preparar a foto."));

  return updateMe({ avatarUrl: `data:image/jpeg;base64,${saved.base64}` });
}
