import { QRCodeSVG } from 'qrcode.react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import PropTypes from 'prop-types';

const RoomQRCode = ({ roomCode }) => {
  const [copied, setCopied] = useState(false);

  // Construir la URL completa con query param para auto-join
  const joinUrl = `${window.location.origin}?room=${roomCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Music Bingo',
          text: `¡Únete a mi sala de Music Bingo! Código: ${roomCode}`,
          url: joinUrl,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card className="bg-black/40 border-white/20 p-4">
      <div className="flex flex-col items-center space-y-3">
        <h3 className="text-white font-semibold text-sm">Comparte para Unirse</h3>

        {/* QR Code */}
        <div className="bg-white p-3 rounded-lg">
          <QRCodeSVG
            value={joinUrl}
            size={120}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Room Code */}
        <div className="text-center">
          <p className="text-white/60 text-xs mb-1">Código de Sala</p>
          <p className="text-2xl font-bold text-purple-400 tracking-wider">{roomCode}</p>
        </div>

        {/* Botones de compartir */}
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant="outline"
            className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copiar Link
              </>
            )}
          </Button>

          {navigator.share && (
            <Button
              onClick={handleShare}
              size="sm"
              variant="outline"
              className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Compartir
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

RoomQRCode.propTypes = {
  roomCode: PropTypes.string.isRequired,
};

export default RoomQRCode;
